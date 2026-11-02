"""
Structure-aware module translators for OmniStudy AI.

Each function translates the content of a specific module type while
preserving its structure, IDs, relationships, layout, and non-text
elements like numbers and formulas.
"""

from typing import Any, Dict, List, Optional
from translator import TranslationEngine
import copy


def _collect_texts(obj: Any, keys_to_translate: set, path: str = "") -> List[tuple]:
    """
    Recursively collect all translatable text values from a nested structure.
    Returns list of (path, value) tuples for batch translation.
    """
    results = []

    if isinstance(obj, dict):
        for key, value in obj.items():
            current_path = f"{path}.{key}" if path else key
            if key in keys_to_translate and isinstance(value, str) and value.strip():
                results.append((current_path, value))
            elif isinstance(value, (dict, list)):
                results.extend(_collect_texts(value, keys_to_translate, current_path))
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            current_path = f"{path}[{i}]"
            if isinstance(item, str) and item.strip():
                # If a list contains strings directly, translate them
                results.append((current_path, item))
            elif isinstance(item, (dict, list)):
                results.extend(_collect_texts(item, keys_to_translate, current_path))

    return results


def _set_value_at_path(obj: Any, path: str, value: str):
    """Set a value in a nested structure using a dot/bracket path."""
    parts = []
    # Parse path like "sections[0].title" into parts
    for part in path.replace("[", ".[").split("."):
        if not part:
            continue
        if part.startswith("[") and part.endswith("]"):
            parts.append(int(part[1:-1]))
        else:
            parts.append(part)

    current = obj
    for i, part in enumerate(parts[:-1]):
        if isinstance(part, int):
            current = current[part]
        else:
            current = current[part]

    last = parts[-1]
    if isinstance(last, int):
        current[last] = value
    else:
        current[last] = value


def _batch_translate_structure(
    data: Any,
    engine: TranslationEngine,
    src_lang: str,
    tgt_lang: str,
    keys_to_translate: set,
) -> Any:
    """
    Generic structure-aware translator. Deep copies the data, collects
    all translatable strings, batch-translates them, and places them back.
    """
    result = copy.deepcopy(data)

    # Collect all translatable texts with their paths
    text_entries = _collect_texts(result, keys_to_translate)

    if not text_entries:
        return result

    paths, texts = zip(*text_entries)

    # Batch translate all texts at once for efficiency
    translated = engine.translate_batch(list(texts), src_lang, tgt_lang)

    # Place translated texts back into structure
    for path, trans_text in zip(paths, translated):
        _set_value_at_path(result, path, trans_text)

    return result


# ── Module-Specific Translators ──────────────────────────────────────────────


def translate_key_points(
    data: Any, engine: TranslationEngine, src_lang: str, tgt_lang: str
) -> Any:
    """
    Translate Key Points (text field).
    Input: list of strings, or a single string
    Output: translated list/string preserving structure
    """
    if isinstance(data, list):
        texts = [t for t in data if isinstance(t, str) and t.strip()]
        if not texts:
            return data
        translated = engine.translate_batch(texts, src_lang, tgt_lang)
        result = list(data)
        j = 0
        for i, item in enumerate(result):
            if isinstance(item, str) and item.strip():
                result[i] = translated[j]
                j += 1
        return result
    elif isinstance(data, str):
        return engine.translate_text(data, src_lang, tgt_lang)
    return data


def translate_outline(
    data: Any, engine: TranslationEngine, src_lang: str, tgt_lang: str
) -> Any:
    """
    Translate Document Outline.
    Translates: headings, bullets, subSection titles, subSection bullets
    Preserves: level numbers, structure
    """
    if not isinstance(data, list):
        return data

    keys_to_translate = {"heading", "title", "bullets"}
    return _batch_translate_structure(data, engine, src_lang, tgt_lang, keys_to_translate)


def translate_mind_map(
    data: Any, engine: TranslationEngine, src_lang: str, tgt_lang: str
) -> Any:
    """
    Translate Mind Map data.
    Translates: node labels/names/titles
    Preserves: IDs, hierarchy, children structure, layout
    """
    keys_to_translate = {"label", "name", "title", "topic"}
    return _batch_translate_structure(data, engine, src_lang, tgt_lang, keys_to_translate)


def translate_infographic(
    data: Any, engine: TranslationEngine, src_lang: str, tgt_lang: str
) -> Any:
    """
    Translate Infographic data.
    Translates: title, section titles, points, flow labels
    Preserves: relevance scores, types, metadata, layout, numbers in context
    """
    keys_to_translate = {"title", "points", "label", "from", "to"}
    return _batch_translate_structure(data, engine, src_lang, tgt_lang, keys_to_translate)


def translate_flashcards(
    data: Any, engine: TranslationEngine, src_lang: str, tgt_lang: str
) -> Any:
    """
    Translate Flashcards.
    Translates: question, answer
    Preserves: card IDs, metadata, structure
    """
    if not isinstance(data, list):
        return data

    keys_to_translate = {"question", "answer", "explanation"}
    return _batch_translate_structure(data, engine, src_lang, tgt_lang, keys_to_translate)


def translate_comparative_table(
    data: Any, engine: TranslationEngine, src_lang: str, tgt_lang: str
) -> Any:
    """
    Translate Comparative Tables.
    Translates: title, headers, row labels, cell text
    Preserves: table structure, numerical values, row/column order
    
    Special handling: cell values that are purely numeric or N/A are not translated.
    """
    if not isinstance(data, list):
        return data

    result = copy.deepcopy(data)

    for table in result:
        if not isinstance(table, dict):
            continue

        # Translate title
        if "title" in table and isinstance(table["title"], str):
            table["title"] = engine.translate_text(table["title"], src_lang, tgt_lang)

        # Translate headers
        if "headers" in table and isinstance(table["headers"], list):
            translatable_headers = [
                h for h in table["headers"] if isinstance(h, str) and h.strip()
            ]
            if translatable_headers:
                translated_headers = engine.translate_batch(
                    translatable_headers, src_lang, tgt_lang
                )
                j = 0
                for i, h in enumerate(table["headers"]):
                    if isinstance(h, str) and h.strip():
                        table["headers"][i] = translated_headers[j]
                        j += 1

        # Translate rows — skip purely numeric cells
        if "rows" in table and isinstance(table["rows"], list):
            # Collect all translatable cells
            all_cells = []
            cell_positions = []  # (row_idx, col_idx)

            for r_idx, row in enumerate(table["rows"]):
                if isinstance(row, list):
                    for c_idx, cell in enumerate(row):
                        if isinstance(cell, str) and cell.strip():
                            # Skip numeric-only cells
                            stripped = cell.strip()
                            if _is_non_translatable_cell(stripped):
                                continue
                            all_cells.append(cell)
                            cell_positions.append((r_idx, c_idx))

            if all_cells:
                translated_cells = engine.translate_batch(
                    all_cells, src_lang, tgt_lang
                )
                for (r_idx, c_idx), trans in zip(cell_positions, translated_cells):
                    table["rows"][r_idx][c_idx] = trans

        # Handle old format with 'concept' keys
        for key in ("concept", "keyFeatures", "examples", "differences"):
            if key in table and isinstance(table[key], str) and table[key].strip():
                table[key] = engine.translate_text(table[key], src_lang, tgt_lang)

    return result


def _is_non_translatable_cell(text: str) -> bool:
    """Check if a cell value should not be translated (numbers, N/A, etc.)."""
    import re
    # Pure numbers (with optional decimals, %, commas)
    if re.match(r'^[\d,.\s%$€₹+-]+$', text):
        return True
    # N/A variants
    if text.lower() in ('n/a', 'na', '-', '—', '–', 'yes', 'no', 'true', 'false'):
        return True
    return False


# ── Module Type Dispatcher ────────────────────────────────────────────────────

MODULE_TRANSLATORS = {
    "text": translate_key_points,
    "documentOutline": translate_outline,
    "mindMapData": translate_mind_map,
    "infographicData": translate_infographic,
    "flashcards": translate_flashcards,
    "comparativeTable": translate_comparative_table,
}


def translate_module(
    module_type: str,
    data: Any,
    engine: TranslationEngine,
    src_lang: str,
    tgt_lang: str,
) -> Any:
    """
    Translate a module by type. Dispatches to the appropriate translator.
    
    Args:
        module_type: One of 'text', 'documentOutline', 'mindMapData',
                     'infographicData', 'flashcards', 'comparativeTable'
        data: The module's raw content data
        engine: The TranslationEngine instance
        src_lang: Source language code (e.g., 'en')
        tgt_lang: Target language code (e.g., 'te')
    
    Returns:
        Translated module data with structure preserved
    """
    translator = MODULE_TRANSLATORS.get(module_type)
    if not translator:
        raise ValueError(f"Unknown module type: {module_type}. "
                         f"Supported: {list(MODULE_TRANSLATORS.keys())}")
    return translator(data, engine, src_lang, tgt_lang)
