"""
Nexus Bots — Qwen3-0.6B fine-tuning with Unsloth + QLoRA.

Usage:
    python train.py                          # Local GPU
    python train.py --colab                  # Colab mode (Drive checkpoints)
    python train.py --push-to-hub            # Push adapter to HF Hub after training
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Ensure finetune/ is on path for config import
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import (
    ADAPTER_DIR,
    BASE_MODEL,
    BF16,
    DATA_DIR,
    FP16,
    GRADIENT_ACCUMULATION_STEPS,
    HF_REPO_ID,
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
    TRAIN_PATH,
    TEST_PATH,
    UNSLOTH_MODEL,
    WARMUP_RATIO,
    WEIGHT_DECAY,
)


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def format_chat_for_training(row: dict) -> dict:
    """Convert a v2 row into the text format expected by SFTTrainer.

    Returns a dict with a single 'text' key containing the full ChatML conversation.
    The SFTTrainer will tokenize this using the model's chat template.
    """
    messages = row.get("messages", [])
    return {"messages": messages}


def main():
    parser = argparse.ArgumentParser(description="Fine-tune Qwen3-0.6B for function calling")
    parser.add_argument("--colab", action="store_true", help="Enable Colab mode (Drive checkpoints)")
    parser.add_argument("--push-to-hub", action="store_true", help="Push adapter to HF Hub after training")
    parser.add_argument("--merge", action="store_true", help="Save merged fp16 model after training")
    parser.add_argument("--resume-from", type=str, default=None, help="Resume from checkpoint path")
    args = parser.parse_args()

    # ── Check dataset exists ─────────────────────────────────────────────
    if not TRAIN_PATH.exists():
        print("Dataset not found. Run prepare_dataset.py first.")
        print(f"  Expected: {TRAIN_PATH}")
        sys.exit(1)

    print("=" * 60)
    print("Nexus Bots — Qwen3-0.6B Fine-Tuning")
    print("=" * 60)

    # ── Load model via Unsloth ───────────────────────────────────────────
    from unsloth import FastLanguageModel

    model_id = UNSLOTH_MODEL if not os.getenv("USE_BASE_MODEL") else BASE_MODEL
    print(f"\nLoading model: {model_id}")
    print(f"Max seq length: {MAX_SEQ_LENGTH}")

    model, tokenizer = FastLanguageModel.get_model(
        model_name=model_id,
        max_seq_length=MAX_SEQ_LENGTH,
        dtype=None,  # auto-detect
        load_in_4bit=True,
    )

    # ── Apply QLoRA adapters ─────────────────────────────────────────────
    print(f"\nApplying QLoRA: r={LORA_R}, alpha={LORA_ALPHA}")
    print(f"Target modules: {TARGET_MODULES}")

    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=TARGET_MODULES,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )

    # ── Load dataset ─────────────────────────────────────────────────────
    from datasets import Dataset

    print(f"\nLoading training data: {TRAIN_PATH}")
    train_raw = load_jsonl(TRAIN_PATH)
    train_data = [format_chat_for_training(row) for row in train_raw]
    train_dataset = Dataset.from_list(train_data)

    print(f"Training examples: {len(train_dataset)}")

    # Load eval set if exists
    eval_dataset = None
    if TEST_PATH.exists():
        test_raw = load_jsonl(TEST_PATH)
        test_data = [format_chat_for_training(row) for row in test_raw]
        eval_dataset = Dataset.from_list(test_data)
        print(f"Eval examples: {len(eval_dataset)}")

    # ── Training arguments ───────────────────────────────────────────────
    from trl import SFTTrainer, SFTConfig

    output_dir = str(ADAPTER_DIR)
    if args.colab:
        # Save to Drive on Colab
        drive_dir = "/content/drive/MyDrive/nexus-bots-checkpoints"
        os.makedirs(drive_dir, exist_ok=True)
        output_dir = drive_dir

    training_args = SFTConfig(
        output_dir=output_dir,
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=PER_DEVICE_BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        learning_rate=LEARNING_RATE,
        warmup_ratio=WARMUP_RATIO,
        lr_scheduler_type=LR_SCHEDULER,
        weight_decay=WEIGHT_DECAY,
        fp16=FP16,
        bf16=BF16,
        logging_steps=LOGGING_STEPS,
        save_steps=SAVE_STEPS,
        save_total_limit=3,
        eval_strategy="steps" if eval_dataset else "no",
        eval_steps=SAVE_STEPS if eval_dataset else None,
        max_seq_length=MAX_SEQ_LENGTH,
        seed=42,
        report_to="none",
        remove_unused_columns=False,
    )

    # ── Trainer ──────────────────────────────────────────────────────────
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        args=training_args,
    )

    # ── Train ────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("Starting training...")
    print(f"Epochs: {NUM_EPOCHS}")
    print(f"Effective batch size: {PER_DEVICE_BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS}")
    print(f"Learning rate: {LEARNING_RATE}")
    print(f"Output: {output_dir}")
    print("=" * 60 + "\n")

    resume_from = args.resume_from
    trainer.train(resume_from_checkpoint=resume_from)

    # ── Save adapter ─────────────────────────────────────────────────────
    save_dir = str(ADAPTER_DIR)
    print(f"\nSaving LoRA adapter → {save_dir}")
    os.makedirs(save_dir, exist_ok=True)
    model.save_pretrained(save_dir)
    tokenizer.save_pretrained(save_dir)

    # ── Merge to fp16 (optional) ─────────────────────────────────────────
    if args.merge:
        print(f"\nMerging to fp16 → {MERGED_DIR}")
        os.makedirs(str(MERGED_DIR), exist_ok=True)
        model.save_pretrained_merged(str(MERGED_DIR), tokenizer, save_method="merged_16bit")

    # ── Push to Hub (optional) ───────────────────────────────────────────
    if args.push_to_hub:
        print(f"\nPushing adapter to HF Hub → {HF_REPO_ID}")
        model.push_to_hub(HF_REPO_ID, token=os.getenv("HF_TOKEN"))
        tokenizer.push_to_hub(HF_REPO_ID, token=os.getenv("HF_TOKEN"))

    print("\n✓ Training complete!")

    # ── Print training stats ─────────────────────────────────────────────
    metrics = trainer.state.log_history
    if metrics:
        train_losses = [m["loss"] for m in metrics if "loss" in m]
        if train_losses:
            print(f"  Final train loss: {train_losses[-1]:.4f}")
        eval_losses = [m["eval_loss"] for m in metrics if "eval_loss" in m]
        if eval_losses:
            print(f"  Final eval loss:  {eval_losses[-1]:.4f}")


if __name__ == "__main__":
    main()
