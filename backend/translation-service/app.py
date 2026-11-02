"""
OmniStudy AI — IndicTrans2 Translation Service

A FastAPI microservice that provides multilingual translation
for OmniStudy AI's six study modules using AI4Bharat's IndicTrans2.

Runs on http://localhost:8000 and is consumed by the Node.js backend.
"""

import time
import traceback
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from translator import TranslationEngine, SUPPORTED_LANGUAGES
from module_translators import translate_module, MODULE_TRANSLATORS

# ── Global engine instance ────────────────────────────────────────────────────
engine = TranslationEngine()


# ── Lifespan: load models at startup ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("  OmniStudy AI Translation Service — Starting Up")
    print("=" * 60)
    start = time.time()
    engine.load()
    elapsed = time.time() - start
    print(f"  Models loaded in {elapsed:.1f}s")
    print("=" * 60)
    yield
    print("[TranslationService] Shutting down...")


app = FastAPI(
    title="OmniStudy AI Translation Service",
    description="IndicTrans2-powered translation for OmniStudy AI study modules",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow requests from the Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response Models ───────────────────────────────────────────────────


class TranslateTextRequest(BaseModel):
    texts: List[str] = Field(..., description="List of text strings to translate")
    src_lang: str = Field("en", description="Source language code (e.g., 'en', 'te')")
    tgt_lang: str = Field(..., description="Target language code (e.g., 'te', 'hi')")


class TranslateTextResponse(BaseModel):
    translated_texts: List[str]
    src_lang: str
    tgt_lang: str
    count: int
    time_ms: float


class TranslateModuleRequest(BaseModel):
    module_type: str = Field(
        ...,
        description="Module type: text, documentOutline, mindMapData, infographicData, flashcards, comparativeTable",
    )
    data: Any = Field(..., description="The raw module content data")
    src_lang: str = Field("en", description="Source language code")
    tgt_lang: str = Field(..., description="Target language code")


class TranslateModuleResponse(BaseModel):
    module_type: str
    translated_data: Any
    src_lang: str
    tgt_lang: str
    time_ms: float


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    supported_languages: Dict[str, Any]
    supported_modules: List[str]


# ── Endpoints ─────────────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if the service is running and models are loaded."""
    return HealthResponse(
        status="ok" if engine.is_loaded else "loading",
        model_loaded=engine.is_loaded,
        supported_languages=SUPPORTED_LANGUAGES,
        supported_modules=list(MODULE_TRANSLATORS.keys()),
    )


@app.get("/languages")
async def get_languages():
    """Return list of supported languages."""
    return {
        "languages": [
            {"code": code, **info}
            for code, info in SUPPORTED_LANGUAGES.items()
        ]
    }


@app.post("/translate", response_model=TranslateTextResponse)
async def translate_texts(request: TranslateTextRequest):
    """
    Translate a batch of plain text strings.
    Used for simple text translation without structure awareness.
    """
    if not engine.is_loaded:
        raise HTTPException(status_code=503, detail="Models are still loading. Please try again shortly.")

    if request.src_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported source language: {request.src_lang}")
    if request.tgt_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported target language: {request.tgt_lang}")

    start = time.time()
    try:
        translated = engine.translate_batch(
            request.texts, request.src_lang, request.tgt_lang
        )
        elapsed_ms = (time.time() - start) * 1000

        return TranslateTextResponse(
            translated_texts=translated,
            src_lang=request.src_lang,
            tgt_lang=request.tgt_lang,
            count=len(translated),
            time_ms=round(elapsed_ms, 1),
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


@app.post("/translate/module", response_model=TranslateModuleResponse)
async def translate_module_endpoint(request: TranslateModuleRequest):
    """
    Translate a structured OmniStudy module while preserving its structure.
    
    Supported module types:
    - text (Key Points)
    - documentOutline (Outline)
    - mindMapData (Mind Maps)
    - infographicData (Infographics)
    - flashcards (Flashcards)
    - comparativeTable (Comparative Tables)
    """
    if not engine.is_loaded:
        raise HTTPException(status_code=503, detail="Models are still loading. Please try again shortly.")

    if request.src_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported source language: {request.src_lang}")
    if request.tgt_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported target language: {request.tgt_lang}")
    if request.module_type not in MODULE_TRANSLATORS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported module type: {request.module_type}. "
                   f"Supported: {list(MODULE_TRANSLATORS.keys())}",
        )

    start = time.time()
    try:
        translated_data = translate_module(
            request.module_type,
            request.data,
            engine,
            request.src_lang,
            request.tgt_lang,
        )
        elapsed_ms = (time.time() - start) * 1000

        return TranslateModuleResponse(
            module_type=request.module_type,
            translated_data=translated_data,
            src_lang=request.src_lang,
            tgt_lang=request.tgt_lang,
            time_ms=round(elapsed_ms, 1),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Module translation failed: {str(e)}")


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
