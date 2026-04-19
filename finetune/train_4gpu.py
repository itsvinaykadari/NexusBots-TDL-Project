"""
Nexus Bots — Qwen3-0.6B QLoRA fine-tuning on 4× A6000 (DDP).

Uses torchrun for data-parallel training — each GPU gets its own process and
processes a different batch. No model parallelism; the 0.6B model fits in fp16
on a single 48 GB A6000 without quantization, which is faster than 4-bit QLoRA.

Launch:
    torchrun --nproc_per_node=4 train_4gpu.py
    torchrun --nproc_per_node=4 train_4gpu.py --merge   # also save merged fp16

Effective batch: 4 GPUs × 4 per-device × 1 accum = 16  (same as single-GPU run)
Expected wall-clock: ~2–3 min  (vs ~9 min single-GPU)
"""

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import (
    ADAPTER_DIR,
    BASE_MODEL,
    BF16,
    DATA_DIR,
    GRADIENT_ACCUMULATION_STEPS,
    LEARNING_RATE,
    LOGGING_STEPS,
    LORA_ALPHA,
    LORA_DROPOUT,
    LORA_R,
    LR_SCHEDULER,
    MAX_SEQ_LENGTH,
    MERGED_DIR,
    NUM_EPOCHS,
    OUTPUT_DIR,
    PER_DEVICE_BATCH_SIZE,
    SAVE_STEPS,
    TARGET_MODULES,
    TEST_PATH,
    TRAIN_PATH,
    WARMUP_RATIO,
    WEIGHT_DECAY,
)

LOCAL_RANK = int(os.environ.get("LOCAL_RANK", 0))
WORLD_SIZE = int(os.environ.get("WORLD_SIZE", 1))
IS_MAIN    = LOCAL_RANK == 0


def log(msg):
    if IS_MAIN:
        print(msg, flush=True)


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--merge", action="store_true", help="Save merged fp16 model after training")
    parser.add_argument("--resume-from", type=str, default=None)
    args = parser.parse_args()

    if not TRAIN_PATH.exists():
        log(f"Dataset not found: {TRAIN_PATH}. Run prepare_dataset.py first.")
        sys.exit(1)

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import LoraConfig, get_peft_model, TaskType
    from datasets import Dataset
    from trl import SFTTrainer, SFTConfig

    log("=" * 60)
    log(f"Nexus Bots — Qwen3-0.6B 4-GPU Training  (world={WORLD_SIZE})")
    log("=" * 60)

    # ── Tokenizer ────────────────────────────────────────────────────────────
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.model_max_length = MAX_SEQ_LENGTH

    # ── Model (full bf16, no quantization — A6000 48 GB has plenty of room) ──
    # Each torchrun process gets its own GPU via LOCAL_RANK.
    # device_map must NOT be "auto" with DDP — each process owns exactly one device.
    log(f"\nLoading {BASE_MODEL} on GPU {LOCAL_RANK}")
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.bfloat16,
        device_map={"": LOCAL_RANK},
    )
    model.config.use_cache = False
    model.enable_input_require_grads()
    model.gradient_checkpointing_enable(
        gradient_checkpointing_kwargs={"use_reentrant": False}
    )

    # ── QLoRA adapters ───────────────────────────────────────────────────────
    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=TARGET_MODULES,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )
    model = get_peft_model(model, lora_config)
    if IS_MAIN:
        model.print_trainable_parameters()

    # ── Dataset ──────────────────────────────────────────────────────────────
    log(f"\nLoading training data: {TRAIN_PATH}")
    train_dataset = Dataset.from_list(
        [{"messages": r["messages"]} for r in load_jsonl(TRAIN_PATH)]
    )
    eval_dataset = None
    if TEST_PATH.exists():
        eval_dataset = Dataset.from_list(
            [{"messages": r["messages"]} for r in load_jsonl(TEST_PATH)]
        )
    log(f"Train: {len(train_dataset)}  Eval: {len(eval_dataset) if eval_dataset else 0}")

    # ── Training args ────────────────────────────────────────────────────────
    # Single-GPU fast path: batch=16 × accum=1 = 16 eff. (same as 4×GPU×4).
    # Use larger per-device batch since A6000 48GB has plenty of headroom for 0.6B bf16.
    effective_batch = 16
    per_device_bs = effective_batch // max(WORLD_SIZE, 1)
    output_dir = str(OUTPUT_DIR / "qwen3-0_6b-fc-v3-4gpu")
    training_args = SFTConfig(
        output_dir=output_dir,
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=per_device_bs,
        gradient_accumulation_steps=1,          # eff = WORLD_SIZE × per_device_bs
        learning_rate=LEARNING_RATE,
        warmup_ratio=WARMUP_RATIO,
        lr_scheduler_type=LR_SCHEDULER,
        weight_decay=WEIGHT_DECAY,
        bf16=BF16,
        fp16=False,
        logging_steps=LOGGING_STEPS,
        save_steps=SAVE_STEPS,
        save_total_limit=2,
        eval_strategy="steps" if eval_dataset else "no",
        eval_steps=50 if eval_dataset else None,
        load_best_model_at_end=True if eval_dataset else False,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        seed=42,
        report_to="none",
        remove_unused_columns=False,
        ddp_backend="gloo",
        ddp_find_unused_parameters=False,
        dataloader_num_workers=2,
    )

    trainer = SFTTrainer(
        model=model,
        processing_class=tokenizer,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        args=training_args,
    )

    log("\n" + "=" * 60)
    log(f"Starting training  (world_size={WORLD_SIZE}, eff_batch=16)")
    log("=" * 60 + "\n")

    trainer.train(resume_from_checkpoint=args.resume_from)

    # ── Save (main process only) ─────────────────────────────────────────────
    if IS_MAIN:
        save_dir = str(ADAPTER_DIR)
        log(f"\nEffective batch: {per_device_bs * max(WORLD_SIZE,1)}")
        log(f"\nSaving LoRA adapter → {save_dir}")
        os.makedirs(save_dir, exist_ok=True)
        model.save_pretrained(save_dir)
        tokenizer.save_pretrained(save_dir)
        log(f"Adapter saved → {save_dir}")

        if args.merge:
            log(f"\nMerging to bf16 → {MERGED_DIR}")
            os.makedirs(str(MERGED_DIR), exist_ok=True)
            merged = model.merge_and_unload()
            merged.save_pretrained(str(MERGED_DIR))
            tokenizer.save_pretrained(str(MERGED_DIR))
            log(f"Merged model saved → {MERGED_DIR}")

        metrics = trainer.state.log_history
        losses = [m["loss"] for m in metrics if "loss" in m]
        if losses:
            log(f"\nFinal train loss: {losses[-1]:.6f}")


if __name__ == "__main__":
    main()
