# ── ZERO GPU INITIALIZATION (MUST BE LINE 1 BEFORE ANY OTHER IMPORTS) ─────────
import spaces
import json
import time
from typing import Any, Dict, List, Optional
import gradio as gr

from translator import TranslationEngine, SUPPORTED_LANGUAGES
from module_translators import translate_module, MODULE_TRANSLATORS

# ── Global engine instance ────────────────────────────────────────────────────
engine = TranslationEngine()


# ── ZeroGPU Accelerated Translation Functions ────────────────────────────────
@spaces.GPU
def translate_text_gpu(text: str, target_language: str) -> str:
    """Interactive translation handler for Gradio UI."""
    if not engine.is_loaded:
        engine.load()
    tgt_code = "te"
    for code, info in SUPPORTED_LANGUAGES.items():
        if info["name"].lower() == target_language.lower() or code == target_language:
            tgt_code = code
            break
    return engine.translate_text(text, "en", tgt_code)


@spaces.GPU
def api_translate_batch(texts_json: str, src_lang: str, tgt_lang: str) -> str:
    """REST API batch text translation endpoint."""
    if not engine.is_loaded:
        engine.load()
    try:
        texts = json.loads(texts_json) if isinstance(texts_json, str) else texts_json
        translated = engine.translate_batch(texts, src_lang, tgt_lang)
        return json.dumps({"translated_texts": translated, "src_lang": src_lang, "tgt_lang": tgt_lang, "count": len(translated)})
    except Exception as e:
        return json.dumps({"error": str(e)})


@spaces.GPU
def api_translate_module(module_type: str, data_json: str, src_lang: str, tgt_lang: str) -> str:
    """REST API module structure translation endpoint."""
    if not engine.is_loaded:
        engine.load()
    try:
        data = json.loads(data_json) if isinstance(data_json, str) else data_json
        translated_data = translate_module(module_type, data, engine, src_lang, tgt_lang)
        return json.dumps({"module_type": module_type, "translated_data": translated_data, "src_lang": src_lang, "tgt_lang": tgt_lang})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ── Gradio Web Application (Native Hugging Face Spaces SDK) ───────────────────
with gr.Blocks(title="OmniStudy AI Translation Service") as demo:
    gr.Markdown("# 🌐 OmniStudy AI — IndicTrans2 Translation Service")
    gr.Markdown("Microservice providing AI4Bharat IndicTrans2 multilingual translation for OmniStudy AI.")

    with gr.Tab("Interactive Translation"):
        with gr.Row():
            inp = gr.Textbox(label="English Text", value="Welcome to OmniStudy AI! Let's master our subjects together.", lines=3)
            lang = gr.Dropdown(
                label="Target Language",
                choices=["Telugu", "Hindi", "Tamil", "Kannada", "Malayalam"],
                value="Telugu",
            )
        out = gr.Textbox(label="Translated Output", lines=3)
        btn = gr.Button("Translate (ZeroGPU)", variant="primary")
        btn.click(fn=translate_text_gpu, inputs=[inp, lang], outputs=out, api_name="translate_demo")

    # API Endpoints (Exposed automatically by Gradio to external callers)
    with gr.Tab("API Endpoints"):
        gr.Markdown("These endpoints are callable via HTTP POST to `/api/translate_batch` and `/api/translate_module`")
        api_batch_in = gr.Textbox(label="Batch Texts JSON", visible=True)
        api_batch_src = gr.Textbox(label="Source Lang", value="en", visible=True)
        api_batch_tgt = gr.Textbox(label="Target Lang", value="te", visible=True)
        api_batch_out = gr.Textbox(label="Result JSON", visible=True)
        batch_btn = gr.Button("Execute Batch Translate")
        batch_btn.click(fn=api_translate_batch, inputs=[api_batch_in, api_batch_src, api_batch_tgt], outputs=api_batch_out, api_name="translate_batch")

        api_mod_type = gr.Textbox(label="Module Type", visible=True)
        api_mod_data = gr.Textbox(label="Module Data JSON", visible=True)
        api_mod_src = gr.Textbox(label="Source Lang", value="en", visible=True)
        api_mod_tgt = gr.Textbox(label="Target Lang", value="te", visible=True)
        api_mod_out = gr.Textbox(label="Result Module JSON", visible=True)
        mod_btn = gr.Button("Execute Module Translate")
        mod_btn.click(fn=api_translate_module, inputs=[api_mod_type, api_mod_data, api_mod_src, api_mod_tgt], outputs=api_mod_out, api_name="translate_module")


# ── Hugging Face Native Launch ────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  OmniStudy AI Translation Service — Starting Up")
    print("=" * 60)
    engine.load()
    demo.launch()
