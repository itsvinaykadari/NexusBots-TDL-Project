#!/usr/bin/env python3
"""
Nexus Bots — FC Model diagnostic script.

Run this directly (no server needed) to check:
  - Python environment & package versions
  - GPU / CUDA availability
  - Model loading from FC_MODEL_ID / FC_MODEL_PATH
  - A sample inference (token counts, latency, raw output)

Usage:
    cd server/
    python3 ai/check_fc_model.py
    python3 ai/check_fc_model.py --query "show me the cheapest robot"
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

# ── Load .env if present ─────────────────────────────────────────────────────
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())
    print(f"[check] Loaded .env from {_env_path}")
else:
    print(f"[check] No .env found at {_env_path}")

# ── Sys.path for fc_model ─────────────────────────────────────────────────────
_ai_dir = str(Path(__file__).resolve().parent)
if _ai_dir not in sys.path:
    sys.path.insert(0, _ai_dir)


def sep(title: str = "") -> None:
    line = "─" * 60
    print(f"\n{line}")
    if title:
        print(f"  {title}")
        print(line)


# ── 1. Python + package versions ─────────────────────────────────────────────
sep("1. Python environment")
print(f"  Python  : {sys.version}")
print(f"  Prefix  : {sys.prefix}")

for pkg in ["torch", "transformers", "accelerate", "unsloth", "peft"]:
    try:
        mod = __import__(pkg)
        print(f"  {pkg:<14}: {getattr(mod, '__version__', 'installed')}")
    except ImportError:
        print(f"  {pkg:<14}: NOT INSTALLED")

# ── 2. CUDA / GPU check ───────────────────────────────────────────────────────
sep("2. GPU / CUDA")
try:
    import torch
    print(f"  torch.version.cuda : {torch.version.cuda}")
    print(f"  CUDA available     : {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            total_gb = props.total_memory / 1024**3
            free_bytes = torch.cuda.mem_get_info(i)[0]
            free_gb = free_bytes / 1024**3
            print(f"  GPU {i}: {props.name}")
            print(f"         Total VRAM : {total_gb:.1f} GB")
            print(f"         Free  VRAM : {free_gb:.1f} GB")
    else:
        print("  No CUDA GPU found — model will run on CPU (slow)")
except ImportError:
    print("  torch not installed — cannot check GPU")

# ── 3. Environment variables ───────────────────────────────────────────────────
sep("3. Relevant environment variables")
for var in ["ENABLE_FC_MODEL", "FC_MODEL_ID", "FC_MODEL_PATH",
            "SARVAM_API_KEY", "PYTHON_BIN"]:
    val = os.getenv(var, "(not set)")
    # Mask API keys
    if "KEY" in var and len(val) > 8:
        val = val[:6] + "..." + val[-4:]
    print(f"  {var:<20}: {val!r}")

# ── 4. HuggingFace cache ───────────────────────────────────────────────────────
sep("4. HuggingFace cache (Qwen models)")
hf_cache = Path.home() / ".cache" / "huggingface" / "hub"
if hf_cache.exists():
    qwen_dirs = sorted(hf_cache.glob("models--Qwen*"))
    if qwen_dirs:
        for d in qwen_dirs:
            try:
                size = sum(f.stat().st_size for f in d.rglob("*") if f.is_file())
                print(f"  {d.name:<50} {size / 1024**3:.2f} GB")
            except Exception:
                print(f"  {d.name}")
    else:
        print("  No Qwen models cached")
else:
    print(f"  HF cache dir not found: {hf_cache}")

# ── 5. Model loading ───────────────────────────────────────────────────────────
sep("5. Model loading via fc_model.load_model()")
enabled = os.getenv("ENABLE_FC_MODEL", "0").strip().lower()
model_ref = os.getenv("FC_MODEL_PATH") or os.getenv("FC_MODEL_ID")
print(f"  ENABLE_FC_MODEL : {enabled!r}")
print(f"  model_ref       : {model_ref!r}")

if enabled not in {"1", "true", "yes"}:
    print("\n  ⚠  ENABLE_FC_MODEL is not '1'. The pipeline uses heuristic by default.")
    print("     Set ENABLE_FC_MODEL=1 in server/.env to enable the Qwen model.")
    print("     Continuing with load test anyway ...\n")

try:
    import fc_model
    print(f"  fc_model imported from: {fc_model.__file__}")
    t0 = time.time()
    ok = fc_model.load_model()
    elapsed = time.time() - t0
    if ok:
        print(f"  ✓ load_model() succeeded in {elapsed:.1f}s")
    else:
        print(f"  ✗ load_model() FAILED after {elapsed:.1f}s")
        print(f"    _load_error = {fc_model._load_error!r}")
        print("\n  Fix suggestions:")
        if not model_ref:
            print("    → Set FC_MODEL_ID=Qwen/Qwen3-0.6B in server/.env")
        elif "No module named" in str(fc_model._load_error):
            missing = fc_model._load_error.split("'")[1] if "'" in str(fc_model._load_error) else "?"
            print(f"    → Install missing package: pip install {missing}")
        elif "CUDA" in str(fc_model._load_error).upper():
            print("    → CUDA error — check nvidia-smi and torch CUDA version")
        sys.exit(1)
except ImportError as e:
    print(f"  ✗ Could not import fc_model: {e}")
    sys.exit(1)

# ── 6. Sample inference ────────────────────────────────────────────────────────
sep("6. Sample inference")
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("--query", default="what is the cheapest robot?")
args, _ = parser.parse_known_args()

query = args.query
context = {"currentPage": "home", "language": "en"}
print(f"  query   : {query!r}")
print(f"  context : {context}")
print()

t0 = time.time()
result = fc_model.predict_tool_call(query, "en", context)
elapsed_ms = (time.time() - t0) * 1000

if result:
    print(f"  ✓ Result in {elapsed_ms:.0f}ms:")
    print(f"    tool      : {result.get('tool')!r}")
    print(f"    arguments : {result.get('arguments')}")
    print(f"    ui_guide  : {result.get('ui_guide')!r}")
else:
    print(f"  ✗ predict_tool_call returned None after {elapsed_ms:.0f}ms")
    print("    Check [FC_MODEL] lines above for the exact error")

# ── 7. GPU utilisation after inference ────────────────────────────────────────
sep("7. GPU memory after inference")
try:
    import torch
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            alloc = torch.cuda.memory_allocated(i) / 1024**3
            reserved = torch.cuda.memory_reserved(i) / 1024**3
            print(f"  GPU {i} allocated: {alloc:.2f} GB | reserved: {reserved:.2f} GB")
    else:
        print("  Running on CPU — check htop/top for CPU usage")
except ImportError:
    pass

sep("Done")
print("  If you see MODEL in decide_tool logs, Qwen is active.")
print("  If you see HEURISTIC, check step 5 above for the root cause.")
