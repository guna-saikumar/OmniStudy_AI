"""
IndicTrans2 Translation Engine for OmniStudy AI.

Wraps AI4Bharat's IndicTrans2 model for bidirectional translation
between English and Indic languages. Loads models once at startup
and provides efficient batch translation.
"""

import sys
import types

# ── Compatibility Patch for IndicTrans2 with Transformers >= 4.45 / 5.x ────────
if "transformers.onnx" not in sys.modules:
    class DummyOnnxConfig:
        def __init__(self, *args, **kwargs):
            pass

    class OnnxModule(types.ModuleType):
        def __getattr__(self, name):
            return DummyOnnxConfig

    onnx_mod = OnnxModule("transformers.onnx")
    onnx_mod.OnnxConfig = DummyOnnxConfig
    onnx_mod.OnnxSeq2SeqConfigWithPast = DummyOnnxConfig
    sys.modules["transformers.onnx"] = onnx_mod

import re
import torch
from typing import List, Optional
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

# ── Language Configuration ────────────────────────────────────────────────────

SUPPORTED_LANGUAGES = {
    "en": {"code": "eng_Latn", "name": "English", "native": "English"},
    "te": {"code": "tel_Telu", "name": "Telugu", "native": "తెలుగు"},
    "hi": {"code": "hin_Deva", "name": "Hindi", "native": "हिन्दी"},
    "ta": {"code": "tam_Taml", "name": "Tamil", "native": "தமிழ்"},
    "kn": {"code": "kan_Knda", "name": "Kannada", "native": "ಕನ್ನಡ"},
    "ml": {"code": "mal_Mlym", "name": "Malayalam", "native": "മലയാളം"},
}

# Models on HuggingFace
EN_INDIC_MODEL = "ai4bharat/indictrans2-en-indic-dist-200M"
INDIC_EN_MODEL = "ai4bharat/indictrans2-indic-en-dist-200M"

# ── Preservable Patterns ─────────────────────────────────────────────────────
# These patterns are extracted before translation and reinserted after,
# so formulas, equations, chemical symbols, names, and acronyms survive intact.

PRESERVE_PATTERNS = [
    # ── LaTeX & Code & URLs ───────────────────────────────────────────────
    (r'\$\$.*?\$\$', 'BLOCK_MATH'),          # Block LaTeX $$...$$
    (r'\$[^$]+?\$', 'INLINE_MATH'),           # Inline LaTeX $...$
    (r'\\[a-zA-Z]+\{[^}]*\}', 'LATEX_CMD'),    # LaTeX commands \cmd{...}
    (r'```[\s\S]*?```', 'CODE_BLOCK'),        # Code blocks ```...```
    (r'`[^`]+`', 'CODE_INLINE'),              # Inline code `...`
    (r'https?://\S+', 'URL'),                 # URLs

    # ── Chemical & Mathematical Formulas / Equations ──────────────────────
    (r'\b(H2O|CO2|NaCl|H2SO4|CH4|NH3|CaCO3|O2|N2|HCl|NaOH|KOH|C6H12O6|ATP|DNA|RNA)\b', 'CHEM_FORMULA'), # Common Chemical formulas
    (r'\b[a-zA-Z0-9_\^\+\-\*/\=\(\)\.]+\s*=\s*[a-zA-Z0-9_\^\+\-\*/\=\(\)\.]+\b', 'EQUATION'), # Math equations (e.g. E=mc^2, y=mx+c, a^2+b^2=c^2, F=ma, V=IR)

    # ── Acronyms & Shortforms ────────────────────────────────────────────
    (r'\b[A-Z0-9_]{2,8}\b', 'ACRONYM'),       # All-caps shortforms & acronyms (AI, CPU, RAM, API, HTTP, URL, PDF, etc.)

    # ── Proper Names & People Names ──────────────────────────────────────
    (r'\b[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+\b', 'FULL_NAME'), # Two/Three-word Proper Names (e.g. Albert Einstein, Isaac Newton, Marie Curie)
    (r'\b(Einstein|Newton|Tesla|Pythagoras|Euclid|Aristotle|Plato|Socrates|Shakespeare|Galileo|Darwin|Curie|Pasteur|Mendel|Kepler|Hubble|Ramanujan|Feynman|Planck|Bohr|Rutherford|Gauss|Euler|Faraday|Maxwell|Hawking|Turing|Schrodinger|Heisenberg|Archimedes|Pascal|Bernoulli|Fourier|Laplace|Lagrange|Descartes|Leibniz|Dijkstra|Knuth|Karnaugh|Boolean|L\'Hopital)\b', 'FAMOUS_NAME'), # Single Famous Names
]


class TranslationEngine:
    """
    Manages IndicTrans2 models for English ↔ Indic translation.
    
    Uses two separate models:
    - en-indic: English → any Indic language
    - indic-en: any Indic language → English
    
    For Indic ↔ Indic (e.g., Telugu → Hindi), translation pivots
    through English automatically.
    """

    def __init__(self, device: Optional[str] = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.en_indic_model = None
        self.en_indic_tokenizer = None
        self.indic_en_model = None
        self.indic_en_tokenizer = None
        self.processor = None
        self._loaded = False

    def load(self):
        """Load models and tokenizer. Call once at startup."""
        if self._loaded:
            return

        print(f"[TranslationEngine] Loading models on device: {self.device}")

        # Import IndicProcessor for text preprocessing
        try:
            from IndicTransToolkit.processor import IndicProcessor
            self.processor = IndicProcessor(inference=True)
            print("[TranslationEngine] IndicProcessor loaded successfully")
        except ImportError:
            # Fallback: try alternative import path
            try:
                from indictranstoolkit import IndicProcessor
                self.processor = IndicProcessor(inference=True)
                print("[TranslationEngine] IndicProcessor loaded (alt import)")
            except ImportError:
                print("[TranslationEngine] WARNING: IndicProcessor not available, using basic preprocessing")
                self.processor = None

        import os
        from dotenv import load_dotenv
        load_dotenv()
        load_dotenv("../.env")
        load_dotenv("../../.env")
        
        hf_token = os.getenv("HF_TOKEN") or None

        # Load English → Indic model
        print(f"[TranslationEngine] Loading EN→Indic model: {EN_INDIC_MODEL}")
        try:
            self.en_indic_tokenizer = AutoTokenizer.from_pretrained(
                EN_INDIC_MODEL, trust_remote_code=True, token=hf_token
            )
            self.en_indic_model = AutoModelForSeq2SeqLM.from_pretrained(
                EN_INDIC_MODEL, trust_remote_code=True, token=hf_token
            ).to(self.device)
            self.en_indic_model.eval()
            print("[TranslationEngine] EN→Indic model loaded")
        except Exception as e:
            if "gated repo" in str(e).lower() or "401" in str(e) or "unauthorized" in str(e).lower():
                print("\n" + "!" * 80)
                print(" ERROR: Gated Hugging Face Model Access Required")
                print(" IndicTrans2 repository requires a free Hugging Face account & token.")
                print(" 1. Accept license at: https://huggingface.co/ai4bharat/indictrans2-en-indic-dist-200M")
                print(" 2. Accept license at: https://huggingface.co/ai4bharat/indictrans2-indic-en-dist-200M")
                print(" 3. Create a free Access Token at: https://huggingface.co/settings/tokens")
                print(" 4. Add HF_TOKEN=hf_... to your .env file or run `huggingface-cli login`")
                print("!" * 80 + "\n")
            raise e

        # Load Indic → English model
        print(f"[TranslationEngine] Loading Indic→EN model: {INDIC_EN_MODEL}")
        try:
            self.indic_en_tokenizer = AutoTokenizer.from_pretrained(
                INDIC_EN_MODEL, trust_remote_code=True, token=hf_token
            )
            self.indic_en_model = AutoModelForSeq2SeqLM.from_pretrained(
                INDIC_EN_MODEL, trust_remote_code=True, token=hf_token
            ).to(self.device)
            self.indic_en_model.eval()
            print("[TranslationEngine] Indic→EN model loaded")
        except Exception as e:
            if "gated repo" in str(e).lower() or "401" in str(e) or "unauthorized" in str(e).lower():
                print("\n" + "!" * 80)
                print(" ERROR: Gated Hugging Face Model Access Required")
                print(" IndicTrans2 repository requires a free Hugging Face account & token.")
                print(" 1. Accept license at: https://huggingface.co/ai4bharat/indictrans2-indic-en-dist-200M")
                print(" 2. Create a free Access Token at: https://huggingface.co/settings/tokens")
                print(" 3. Add HF_TOKEN=hf_... to your .env file or run `huggingface-cli login`")
                print("!" * 80 + "\n")
            raise e

        self._loaded = True
        print("[TranslationEngine] All models loaded and ready!")

    def _build_split_pattern(self) -> re.Pattern:
        """
        Build a single combined regex from all PRESERVE_PATTERNS.
        This splits text into alternating segments: [translatable, preserved, translatable, preserved, ...]
        """
        all_patterns = [p for p, _ in PRESERVE_PATTERNS]
        combined = "|".join(f"({p})" for p in all_patterns)
        return re.compile(combined, re.DOTALL)

    def _split_text(self, text: str) -> list:
        """
        Split text into segments. Each segment is a dict:
          {"type": "text", "value": "..."} — translatable plain text
          {"type": "preserve", "value": "..."} — formula/code/name to keep as-is
        """
        pattern = self._build_split_pattern()
        segments = []
        last_end = 0

        for match in pattern.finditer(text):
            start, end = match.start(), match.end()
            # Add any plain text before this match
            if start > last_end:
                plain = text[last_end:start]
                if plain.strip():
                    segments.append({"type": "text", "value": plain})
                elif plain:
                    segments.append({"type": "whitespace", "value": plain})
            # Add the preserved match
            segments.append({"type": "preserve", "value": match.group()})
            last_end = end

        # Add any remaining text after the last match
        if last_end < len(text):
            remaining = text[last_end:]
            if remaining.strip():
                segments.append({"type": "text", "value": remaining})
            elif remaining:
                segments.append({"type": "whitespace", "value": remaining})

        # If nothing was split (no preservable patterns found), return the whole text
        if not segments:
            segments.append({"type": "text", "value": text})

        return segments

    def _preprocess(self, texts: List[str], src_lang: str, tgt_lang: str) -> List[str]:
        """Preprocess texts using IndicProcessor if available."""
        if self.processor:
            return self.processor.preprocess_batch(texts, src_lang=src_lang, tgt_lang=tgt_lang)
        # Basic fallback: just return texts as-is
        return texts

    def _postprocess(self, texts: List[str], tgt_lang: str) -> List[str]:
        """Postprocess translated texts using IndicProcessor if available."""
        if self.processor:
            try:
                return self.processor.postprocess_batch(texts, lang=tgt_lang)
            except Exception:
                return texts
        return texts

    def translate_batch(
        self,
        texts: List[str],
        src_lang: str,
        tgt_lang: str,
        max_length: int = 512,
        num_beams: int = 5,
    ) -> List[str]:
        """
        Translate a batch of texts from src_lang to tgt_lang.
        
        Args:
            texts: List of strings to translate
            src_lang: Source language short code (e.g., 'en', 'te')
            tgt_lang: Target language short code (e.g., 'te', 'hi')
            max_length: Maximum output length
            num_beams: Beam search width (higher = better quality, slower)
        
        Returns:
            List of translated strings
        """
        if not self._loaded:
            raise RuntimeError("Models not loaded. Call load() first.")

        if src_lang == tgt_lang:
            return texts

        # Filter empty strings
        non_empty_indices = [i for i, t in enumerate(texts) if t and t.strip()]
        if not non_empty_indices:
            return texts

        non_empty_texts = [texts[i] for i in non_empty_indices]

        # Handle Indic → Indic via English pivot
        if src_lang != "en" and tgt_lang != "en":
            english_texts = self._translate_direct(
                non_empty_texts, src_lang, "en", max_length, num_beams
            )
            translated = self._translate_direct(
                english_texts, "en", tgt_lang, max_length, num_beams
            )
        else:
            translated = self._translate_direct(
                non_empty_texts, src_lang, tgt_lang, max_length, num_beams
            )

        # Rebuild full result list preserving empty strings
        result = list(texts)
        for idx, trans in zip(non_empty_indices, translated):
            result[idx] = trans

        return result

    def _translate_direct(
        self,
        texts: List[str],
        src_lang: str,
        tgt_lang: str,
        max_length: int,
        num_beams: int,
    ) -> List[str]:
        """
        Segment-based translation: splits each text into translatable and
        preserved segments, translates only the translatable parts, then
        stitches everything back together. Formulas, LaTeX, code, URLs,
        equations, acronyms, and proper names are NEVER sent to the model.
        """

        # Determine which model to use
        if src_lang == "en":
            model = self.en_indic_model
            tokenizer = self.en_indic_tokenizer
        else:
            model = self.indic_en_model
            tokenizer = self.indic_en_tokenizer

        src_code = SUPPORTED_LANGUAGES[src_lang]["code"]
        tgt_code = SUPPORTED_LANGUAGES[tgt_lang]["code"]

        # Step 1: Split every text into segments
        all_segments = []
        for text in texts:
            segments = self._split_text(text)
            all_segments.append(segments)

        # Step 2: Collect ALL translatable segments across all texts into a flat batch
        translatable_texts = []
        translatable_map = []  # (text_idx, segment_idx)

        for text_idx, segments in enumerate(all_segments):
            for seg_idx, seg in enumerate(segments):
                if seg["type"] == "text":
                    translatable_texts.append(seg["value"])
                    translatable_map.append((text_idx, seg_idx))

        # Step 3: Translate ALL translatable segments in one efficient batch
        if translatable_texts:
            processed = self._preprocess(translatable_texts, src_code, tgt_code)

            BATCH_SIZE = 8
            all_translations = []

            for batch_start in range(0, len(processed), BATCH_SIZE):
                batch = processed[batch_start:batch_start + BATCH_SIZE]

                inputs = tokenizer(
                    batch,
                    padding="longest",
                    truncation=True,
                    max_length=max_length,
                    return_tensors="pt",
                ).to(self.device)

                with torch.inference_mode():
                    outputs = model.generate(
                        **inputs,
                        num_beams=num_beams,
                        num_return_sequences=1,
                        max_length=max_length,
                    )

                decoded = tokenizer.batch_decode(outputs, skip_special_tokens=True)
                all_translations.extend(decoded)

            # Postprocess
            all_translations = self._postprocess(all_translations, tgt_code)

            # Step 4: Put translated segments back in their places
            for i, (text_idx, seg_idx) in enumerate(translatable_map):
                all_segments[text_idx][seg_idx]["value"] = all_translations[i]

        # Step 5: Reassemble each text from its segments
        result = []
        for segments in all_segments:
            assembled = "".join(seg["value"] for seg in segments)
            result.append(assembled)

        return result

    def translate_text(self, text: str, src_lang: str, tgt_lang: str) -> str:
        """Translate a single text string."""
        if not text or not text.strip():
            return text
        results = self.translate_batch([text], src_lang, tgt_lang)
        return results[0]

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def get_supported_languages(self) -> dict:
        return SUPPORTED_LANGUAGES
