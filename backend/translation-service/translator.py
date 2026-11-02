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
    onnx_mod = types.ModuleType("transformers.onnx")
    onnx_mod.__file__ = "transformers/onnx/__init__.py"
    onnx_mod.__path__ = ["transformers/onnx"]

    class OnnxConfig:
        pass

    class OnnxSeq2SeqConfigWithPast:
        pass

    onnx_mod.OnnxConfig = OnnxConfig
    onnx_mod.OnnxSeq2SeqConfigWithPast = OnnxSeq2SeqConfigWithPast
    sys.modules["transformers.onnx"] = onnx_mod

    # Submodule: transformers.onnx.utils
    utils_mod = types.ModuleType("transformers.onnx.utils")
    utils_mod.__file__ = "transformers/onnx/utils.py"

    def compute_effective_axis_dimension(*args, **kwargs):
        return 1

    utils_mod.compute_effective_axis_dimension = compute_effective_axis_dimension
    sys.modules["transformers.onnx.utils"] = utils_mod
    onnx_mod.utils = utils_mod

# ── Compatibility Patch: Tokenizer _special_tokens_map initialization ──────────
from transformers.tokenization_utils_base import PreTrainedTokenizerBase

if not hasattr(PreTrainedTokenizerBase, "_omnistudy_tokenizer_patched"):
    PreTrainedTokenizerBase._omnistudy_tokenizer_patched = True
    orig_tokenizer_setattr = PreTrainedTokenizerBase.__setattr__

    def _patched_tokenizer_setattr(self, name, value):
        if not hasattr(self, "_special_tokens_map"):
            object.__setattr__(self, "_special_tokens_map", {})
        orig_tokenizer_setattr(self, name, value)

    PreTrainedTokenizerBase.__setattr__ = _patched_tokenizer_setattr

# ── Compatibility Patch 3: Model weight tying compatibility ───────────────────
from transformers.modeling_utils import PreTrainedModel

if not hasattr(PreTrainedModel, "_omnistudy_patched"):
    PreTrainedModel._omnistudy_patched = True

    def _tie_or_clone_weights(self, output_embeddings, input_embeddings):
        import torch
        if getattr(self.config, "torchscript", False):
            output_embeddings.weight = torch.nn.Parameter(input_embeddings.weight.clone())
        else:
            output_embeddings.weight = input_embeddings.weight

        if getattr(output_embeddings, "bias", None) is not None:
            output_embeddings.bias.data = torch.nn.functional.pad(
                output_embeddings.bias.data,
                (0, output_embeddings.weight.shape[0] - output_embeddings.bias.shape[0]),
                "constant",
                0,
            )
        if hasattr(output_embeddings, "out_features") and hasattr(input_embeddings, "num_embeddings"):
            output_embeddings.out_features = input_embeddings.num_embeddings

    PreTrainedModel._tie_or_clone_weights = _tie_or_clone_weights

    _real_init_weights = PreTrainedModel.init_weights

    def _safe_init_weights(self, *args, **kwargs):
        orig_tie = getattr(self, "tie_weights", None)
        if orig_tie is not None and not getattr(orig_tie, "_is_safe", False):
            def _safe_tie(*t_args, **t_kwargs):
                return orig_tie()
            _safe_tie._is_safe = True
            self.tie_weights = _safe_tie
        return _real_init_weights(self, *args, **kwargs)

    PreTrainedModel.init_weights = _safe_init_weights

import re
import unicodedata
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


# ── Script Transliteration (Devanagari → Target Script) ────────────────────────
# IndicTrans2 models generate output in a unified Devanagari script space.
# For Hindi (hin_Deva), it is already Devanagari.
# For Telugu, Tamil, Kannada, Malayalam, it must be transliterated to the native script.

_FLORES_TO_SANSCRIPT = None

def _get_sanscript_mapping():
    global _FLORES_TO_SANSCRIPT
    if _FLORES_TO_SANSCRIPT is not None:
        return _FLORES_TO_SANSCRIPT
    try:
        from indic_transliteration import sanscript
        _FLORES_TO_SANSCRIPT = {
            "tel_Telu": sanscript.TELUGU,
            "hin_Deva": sanscript.DEVANAGARI,
            "tam_Taml": sanscript.TAMIL,
            "kan_Knda": sanscript.KANNADA,
            "mal_Mlym": sanscript.MALAYALAM,
            "eng_Latn": None,
        }
        return _FLORES_TO_SANSCRIPT
    except ImportError:
        _FLORES_TO_SANSCRIPT = {}
        return _FLORES_TO_SANSCRIPT


def _transliterate_devanagari_to_target(text: str, tgt_lang: str) -> str:
    """Convert Devanagari text to target script (Telugu, Tamil, Kannada, Malayalam)."""
    if tgt_lang in ("hin_Deva", "eng_Latn"):
        return text

    mapping = _get_sanscript_mapping()
    target_scheme = mapping.get(tgt_lang) if mapping else None
    if not target_scheme:
        return text

    try:
        from indic_transliteration import sanscript
        from indic_transliteration.sanscript import transliterate
        return transliterate(text, sanscript.DEVANAGARI, target_scheme)
    except Exception as e:
        print(f"[TranslationEngine] Transliteration warning: {e}")
        return text


# ── Preservable Patterns ─────────────────────────────────────────────────────
# Patterns to keep verbatim (LaTeX, code, URLs, chemical formulas, equations)

PRESERVE_PATTERNS = [
    (r'\$\$.*?\$\$', 'BLOCK_MATH'),
    (r'\$[^$]+?\$', 'INLINE_MATH'),
    (r'\\[a-zA-Z]+\{[^}]*\}', 'LATEX_CMD'),
    (r'```[\s\S]*?```', 'CODE_BLOCK'),
    (r'`[^`]+`', 'CODE_INLINE'),
    (r'https?://\S+', 'URL'),
    (r'\b(H2O|CO2|NaCl|H2SO4|CH4|NH3|CaCO3|O2|N2|HCl|NaOH|KOH|C6H12O6|ATP|DNA|RNA)\b', 'CHEM_FORMULA'),
    (r'\b[a-zA-Z0-9_\^\+\-\*/\=\(\)\.]+\s*=\s*[a-zA-Z0-9_\^\+\-\*/\=\(\)\.]+\b', 'EQUATION'),
]


class TranslationEngine:
    """
    Manages IndicTrans2 models for English ↔ Indic translation.
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

        # Try loading IndicProcessor with all possible import variants
        try:
            from IndicTransToolkit import IndicProcessor
            self.processor = IndicProcessor(inference=True)
            print("[TranslationEngine] IndicProcessor loaded successfully")
        except Exception as e1:
            try:
                from IndicTransToolkit.processor import IndicProcessor
                self.processor = IndicProcessor(inference=True)
                print("[TranslationEngine] IndicProcessor loaded (from processor)")
            except Exception as e2:
                try:
                    from indictranstoolkit import IndicProcessor
                    self.processor = IndicProcessor(inference=True)
                    print("[TranslationEngine] IndicProcessor loaded (alt import)")
                except Exception as e3:
                    print(f"[TranslationEngine] IndicProcessor not available (e1={e1}, e2={e2}, e3={e3}). Using robust fallback pipeline.")
                    self.processor = None

        import os
        from dotenv import load_dotenv
        load_dotenv()
        load_dotenv("../.env")
        load_dotenv("../../.env")
        
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            hf_token = hf_token.strip()
        if not hf_token:
            hf_token = None

        # Load English → Indic model
        print(f"[TranslationEngine] Loading EN→Indic model: {EN_INDIC_MODEL}")
        self.en_indic_tokenizer = AutoTokenizer.from_pretrained(
            EN_INDIC_MODEL, trust_remote_code=True, token=hf_token
        )
        self.en_indic_model = AutoModelForSeq2SeqLM.from_pretrained(
            EN_INDIC_MODEL, trust_remote_code=True, token=hf_token
        ).to(self.device)
        self.en_indic_model.eval()
        print("[TranslationEngine] EN→Indic model loaded")

        # Load Indic → English model
        print(f"[TranslationEngine] Loading Indic→EN model: {INDIC_EN_MODEL}")
        self.indic_en_tokenizer = AutoTokenizer.from_pretrained(
            INDIC_EN_MODEL, trust_remote_code=True, token=hf_token
        )
        self.indic_en_model = AutoModelForSeq2SeqLM.from_pretrained(
            INDIC_EN_MODEL, trust_remote_code=True, token=hf_token
        ).to(self.device)
        self.indic_en_model.eval()
        print("[TranslationEngine] Indic→EN model loaded")

        self._loaded = True
        print("[TranslationEngine] All models loaded and ready!")

    def _build_split_pattern(self) -> re.Pattern:
        all_patterns = [p for p, _ in PRESERVE_PATTERNS]
        combined = "|".join(f"({p})" for p in all_patterns)
        return re.compile(combined, re.DOTALL)

    def _split_text(self, text: str) -> list:
        pattern = self._build_split_pattern()
        segments = []
        last_end = 0

        for match in pattern.finditer(text):
            start, end = match.start(), match.end()
            if start > last_end:
                plain = text[last_end:start]
                if plain.strip():
                    segments.append({"type": "text", "value": plain})
                elif plain:
                    segments.append({"type": "whitespace", "value": plain})
            segments.append({"type": "preserve", "value": match.group()})
            last_end = end

        if last_end < len(text):
            remaining = text[last_end:]
            if remaining.strip():
                segments.append({"type": "text", "value": remaining})
            elif remaining:
                segments.append({"type": "whitespace", "value": remaining})

        if not segments:
            segments.append({"type": "text", "value": text})

        return segments

    def _preprocess(self, texts: List[str], src_lang: str, tgt_lang: str) -> List[str]:
        """
        Preprocess input texts.
        IndicTrans2 tokenizer's _src_tokenize strictly requires:
            src_lang, tgt_lang, text = text.split(" ", 2)
            assert src_lang in LANGUAGE_TAGS
            assert tgt_lang in LANGUAGE_TAGS
        So texts passed to tokenizer MUST start with '{src_lang} {tgt_lang} '.
        """
        if self.processor:
            try:
                res = self.processor.preprocess_batch(texts, src_lang=src_lang, tgt_lang=tgt_lang)
                print(f"[TranslationEngine] IndicProcessor preprocessed {len(texts)} texts")
                return res
            except Exception as e:
                print(f"[TranslationEngine] IndicProcessor preprocess failed: {e}")

        # Manual Fallback Preprocessing
        processed = []
        for text in texts:
            t = text.strip()
            t = unicodedata.normalize("NFC", t)
            t = t.replace("\u200b", "").replace("\ufeff", "")
            # MANDATORY: Prepend language tags required by tokenization_indictrans.py
            processed.append(f"{src_lang} {tgt_lang} {t}")

        return processed

    def _postprocess(self, texts: List[str], tgt_lang: str) -> List[str]:
        """
        Postprocess output texts.
        Converts the model's unified Devanagari output to target native script.
        """
        if self.processor:
            try:
                res = self.processor.postprocess_batch(texts, lang=tgt_lang)
                print(f"[TranslationEngine] IndicProcessor postprocessed {len(texts)} texts")
                return res
            except Exception as e:
                print(f"[TranslationEngine] IndicProcessor postprocess failed: {e}")

        # Manual Fallback Postprocessing
        results = []
        for text in texts:
            val = text.strip()
            if val.startswith(tgt_lang):
                val = val[len(tgt_lang):].strip()
            converted = _transliterate_devanagari_to_target(val, tgt_lang)
            results.append(converted)
        return results

    def translate_batch(
        self,
        texts: List[str],
        src_lang: str,
        tgt_lang: str,
        max_length: int = 256,
        num_beams: int = 5,
    ) -> List[str]:
        if not self._loaded:
            raise RuntimeError("Models not loaded. Call load() first.")

        if src_lang == tgt_lang:
            return texts

        non_empty_indices = [i for i, t in enumerate(texts) if t and t.strip()]
        if not non_empty_indices:
            return texts

        non_empty_texts = [texts[i] for i in non_empty_indices]

        # Indic ↔ Indic via English pivot
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
        if src_lang == "en":
            model = self.en_indic_model
            tokenizer = self.en_indic_tokenizer
        else:
            model = self.indic_en_model
            tokenizer = self.indic_en_tokenizer

        src_code = SUPPORTED_LANGUAGES[src_lang]["code"]
        tgt_code = SUPPORTED_LANGUAGES[tgt_lang]["code"]

        # Step 1: Split into translatable and preserved segments
        all_segments = []
        for text in texts:
            all_segments.append(self._split_text(text))

        # Step 2: Flatten translatable segments
        translatable_texts = []
        translatable_map = []

        for text_idx, segments in enumerate(all_segments):
            for seg_idx, seg in enumerate(segments):
                if seg["type"] == "text":
                    translatable_texts.append(seg["value"])
                    translatable_map.append((text_idx, seg_idx))

        # Step 3: Preprocess with language tags and generate
        if translatable_texts:
            processed = self._preprocess(translatable_texts, src_code, tgt_code)

            BATCH_SIZE = 8
            all_translations = []

            for batch_start in range(0, len(processed), BATCH_SIZE):
                batch = processed[batch_start:batch_start + BATCH_SIZE]

                # CRITICAL: IndicTransTokenizer requires src=True for encoding inputs
                try:
                    inputs = tokenizer(
                        batch,
                        src=True,
                        padding="longest",
                        truncation=True,
                        max_length=max_length,
                        return_tensors="pt",
                        return_attention_mask=True,
                    ).to(self.device)
                except TypeError:
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
                        min_length=0,
                        use_cache=False,
                    )

                # CRITICAL: IndicTransTokenizer requires src=False to decode target tokens!
                # Without src=False, it decodes target tokens using the SOURCE (English) vocabulary,
                # which maps Indic characters to "(" (parentheses)!
                token_ids = outputs.detach().cpu().tolist()
                try:
                    decoded = tokenizer.batch_decode(token_ids, src=False)
                except TypeError:
                    try:
                        decoded = tokenizer.batch_decode(outputs, src=False)
                    except TypeError:
                        decoded = tokenizer.batch_decode(outputs, skip_special_tokens=True)

                print(f"[TranslationEngine] Raw decoded output (first): {decoded[0][:100] if decoded else 'EMPTY'}")
                all_translations.extend(decoded)

            # Step 4: Postprocess (converts Devanagari to target script)
            all_translations = self._postprocess(all_translations, tgt_code)
            print(f"[TranslationEngine] After postprocess (first): {all_translations[0][:100] if all_translations else 'EMPTY'}")

            # Step 5: Put back
            for i, (text_idx, seg_idx) in enumerate(translatable_map):
                all_segments[text_idx][seg_idx]["value"] = all_translations[i]

        # Step 6: Assemble
        result = []
        for segments in all_segments:
            result.append("".join(seg["value"] for seg in segments))

        return result

    def translate_text(self, text: str, src_lang: str, tgt_lang: str) -> str:
        if not text or not text.strip():
            return text
        results = self.translate_batch([text], src_lang, tgt_lang)
        return results[0]

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def get_supported_languages(self) -> dict:
        return SUPPORTED_LANGUAGES
