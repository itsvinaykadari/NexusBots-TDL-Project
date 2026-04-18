"""
Nexus Bots — Inference module for fine-tuned Qwen3.5-0.8B.

Usage:
    # Interactive
    python inference.py --query "Show me drones" --context '{"current_page":"catalog"}'

    # As a library
    from inference import FunctionCallingModel
    model = FunctionCallingModel("output/qwen35-0_8b-fc-v1")
    result = model.predict("Show me drones", {"current_page": "catalog"})
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import ADAPTER_DIR, MERGED_DIR, SYSTEM_PROMPT, MAX_SEQ_LENGTH, UI_GUIDE_KEYS


class FunctionCallingModel:
    """Loads fine-tuned Qwen3.5-0.8B and predicts tool calls."""

    def __init__(self, model_path: str | None = None, use_merged: bool = False):
        self._model = None
        self._tokenizer = None
        self._model_path = model_path

        if model_path is None:
            if use_merged and MERGED_DIR.exists():
                self._model_path = str(MERGED_DIR)
            elif ADAPTER_DIR.exists():
                self._model_path = str(ADAPTER_DIR)
            else:
                raise FileNotFoundError(
                    "No fine-tuned model found. Run train.py first or pass --model-path."
                )

    def _load(self):
        if self._model is not None:
            return

        from unsloth import FastLanguageModel

        print(f"Loading model from {self._model_path}...")
        self._model, self._tokenizer = FastLanguageModel.from_pretrained(
            model_name=self._model_path,
            max_seq_length=MAX_SEQ_LENGTH,
            dtype=None,
            load_in_4bit=True,
        )
        FastLanguageModel.for_inference(self._model)
        print("Model loaded.")

    def predict(self, query: str, context: dict | None = None) -> dict:
        """Run inference and return parsed tool call + ui_guide."""
        self._load()

        context = context or {}
        user_content = f"Query: {query}\nContext: {json.dumps(context, ensure_ascii=False)}"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        input_text = self._tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )

        inputs = self._tokenizer(input_text, return_tensors="pt").to(self._model.device)

        start = time.perf_counter()
        outputs = self._model.generate(
            **inputs,
            max_new_tokens=256,
            temperature=0.1,
            do_sample=True,
            top_p=0.9,
            pad_token_id=self._tokenizer.eos_token_id,
        )
        latency_ms = (time.perf_counter() - start) * 1000

        # Decode only the generated portion
        generated_ids = outputs[0][inputs["input_ids"].shape[1]:]
        raw_output = self._tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

        # Parse JSON from output
        result = self._parse_output(raw_output)
        result["raw_output"] = raw_output
        result["latency_ms"] = round(latency_ms, 1)
        return result

    @staticmethod
    def _parse_output(text: str) -> dict:
        """Extract JSON tool call from model output."""
        # Try direct JSON parse
        try:
            obj = json.loads(text)
            return {
                "tool": obj.get("tool", ""),
                "arguments": obj.get("arguments", {}),
                "ui_guide": obj.get("ui_guide"),
                "parse_ok": True,
            }
        except json.JSONDecodeError:
            pass

        # Try to find JSON in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                obj = json.loads(text[start:end])
                return {
                    "tool": obj.get("tool", ""),
                    "arguments": obj.get("arguments", {}),
                    "ui_guide": obj.get("ui_guide"),
                    "parse_ok": True,
                }
            except json.JSONDecodeError:
                pass

        return {
            "tool": "",
            "arguments": {},
            "ui_guide": None,
            "parse_ok": False,
        }


def main():
    parser = argparse.ArgumentParser(description="Run inference with fine-tuned model")
    parser.add_argument("--query", type=str, required=True, help="User query")
    parser.add_argument("--context", type=str, default="{}", help="Page context JSON")
    parser.add_argument("--model-path", type=str, default=None, help="Path to model")
    parser.add_argument("--merged", action="store_true", help="Use merged model")
    args = parser.parse_args()

    context = json.loads(args.context)
    model = FunctionCallingModel(model_path=args.model_path, use_merged=args.merged)
    result = model.predict(args.query, context)

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
