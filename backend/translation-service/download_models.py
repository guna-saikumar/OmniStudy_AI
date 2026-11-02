"""
Model Pre-downloader for OmniStudy AI Translation Service.

Downloads IndicTrans2 model checkpoints from Hugging Face to local cache.
Reads HF_TOKEN from .env.
"""

import os
from dotenv import load_dotenv

load_dotenv()
load_dotenv("../.env")

from huggingface_hub import snapshot_download

token = os.getenv("HF_TOKEN")
if not token:
    print("❌ HF_TOKEN not found in .env!")
    print("Please make sure HF_TOKEN=hf_... is in your .env file.")
    exit(1)

print("=" * 60)
print("  Downloading IndicTrans2 Models to Cache")
print("=" * 60)

print("\n[1/2] Downloading EN -> Indic model (ai4bharat/indictrans2-en-indic-dist-200M)...")
snapshot_download("ai4bharat/indictrans2-en-indic-dist-200M", token=token)
print("✓ EN -> Indic model downloaded successfully!\n")

print("[2/2] Downloading Indic -> EN model (ai4bharat/indictrans2-indic-en-dist-200M)...")
snapshot_download("ai4bharat/indictrans2-indic-en-dist-200M", token=token)
print("✓ Indic -> EN model downloaded successfully!\n")

print("=" * 60)
print("  ✅ All models cached! You can now start the service with:")
print("     python app.py")
print("=" * 60)