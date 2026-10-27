# Importing educational content

GreekLabs reads `data/content/catalog.json`. All learning material is plain UTF-8 JSON, independent of templates and frontend code. No HTML, executable JavaScript, Markdown rendering or AI service is used for content. Paragraph breaks are newline characters in strings. Polytonic Greek is preserved as supplied; accent-insensitive search normalises a search copy only.

Use `docs/examples/content-bundle.json` as a structural template. It contains **bracketed placeholders, not teaching material** and is not installed in the app. It intentionally uses `draft` status. Replace placeholders and validate all educational content separately before publishing. Example exercise numbers 101 avoid the installed demo numbers 1 and 2; assign real numbers deliberately.

## Safe workflow

```sh
# Inspect the installed catalogue.
python manage.py validate_content

# Validate a partial bundle against existing content; NO writes by default.
python manage.py import_content path/to/reviewed-bundle.json

# Save a valid bundle; automatic backup, lock, and atomic replacement.
python manage.py import_content path/to/reviewed-bundle.json --apply

# Intentional replacement of records with existing IDs (first dry-run).
python manage.py import_content path/to/reviewed-bundle.json --replace-existing
python manage.py import_content path/to/reviewed-bundle.json --replace-existing --apply
```

Each bundle has `"schema_version": 1` and any of the collections below. Omitted collections and unrelated records are preserved. Existing IDs cause an error unless `--replace-existing` is explicit. That option replaces **entire matching records**, not individual fields. Include all fields you want to keep. There is no import deletion operation. A backup of the entire previous catalogue is saved in `backups/content/` before every applied import. Concurrent imports are serialised with a local file lock. Invalid imports leave the catalogue unchanged.

Reload the browser after an import. There is no frontend rebuild. To restore a content backup, copy the desired backup JSON over `data/content/catalog.json`, run validation, and reload. Browser progress is independent of content files.

## Common fields and conventions

- `id`: required, immutable, lowercase letters/digits/hyphens/underscores; starts with a letter or digit. Unique **within its collection**. Do not reuse an ID for unrelated material, because progress belongs to that ID.
- `title`: required for all records except annotations.
- `status`: required: `published`, `draft`, or `sample`. Published means content supplied for normal use; the application does not verify scholarship. Drafts are visible with an incomplete label. Samples have an unverified demo label and are excluded from language/practice study totals.
- `difficulty`: `foundation`, `developing`, `advanced`. Required on unseen and composition exercises, optional elsewhere.
- `topic_ids`: optional list of IDs from the `grammar` collection.
- All prose fields are strings. Lists must be arrays. References must resolve in the merged catalogue, so related records can arrive in the same bundle.
- Published literature sections and unseen passages require non-empty Greek and English; published compositions require English and a model Greek answer. Published grammar topics require an explanation. This checks structure, not authenticity or translation quality.
- Keep content and progress schemas separate: the content bundle version is **1**; browser progress export version is **2**.

## Collections

| Collection | Required fields beyond common fields | Optional fields / behaviour |
| --- | --- | --- |
| `texts` | `author`, `genre`, `scope` | `description`; existing IDs are `electra`, `herodotus` (Book 7), `odyssey-22`, `herodotus-8`. Set a new text's status to published when its material is ready. |
| `sections` | `text_id`, positive integer `number`, `reference`, `alignment`, `units` | `greek`, `translation`, `translation_type` (`literal`, `supplied`, `literary`), `source`, `topic_ids`, `alignment_note`, `source_note`, paired `line_start` and `line_end`, optional `lines`. Number unique within a text. |
| `grammar` | `category` | `summary`, `explanation`, `examples`, `exercises`, `related_ids`, `topic_ids`, `difficulty`. Related IDs refer to other grammar topics. |
| `vocabulary` | `greek`, `english` | `notes`, `topic_ids`. Used by the searchable reveal-and-review flashcards. |
| `unseen` | positive integer `number`, `author`, `genre`, `difficulty`, `origin`, `source` | `greek`, `translation`, `topic_ids`, `glosses`, `hints`. Number unique within unseen. Origin is `original` (ancient source), `adapted`, or `composed` (new Greek). |
| `compositions` | positive integer `number`, `format`, `difficulty` | `english`, `model_greek`, `topic_ids`, `vocabulary`, `hints`, `alternatives`, `notes`. Format is `sentences` or `continuous`. Number unique within compositions. |
| `annotations` | `text_id`, `section_id`, `reference`, `quote`, `technique`, `effect`, `context` | Optional `unit_id` must belong to that section; `title` optional. Context holds thematic/character/dramatic relevance. |
| `questions` | `text_id`, `reference`, `question` | `section_ids`, `quotations` (strings), `points` (strings), `guidance` (string). Empty/omitted section IDs make the question available throughout its text. |

The generic `greek` and `translation` section fields retain the entire source; reading modes use `units`. **Update both if editing the text**, and have a reviewer confirm they represent the same material. The validator cannot judge semantic equivalence.

### Reading units and verse numbers

`alignment` is `line`, `sentence`, `subsection`, or `section`. Each unit has a stable `id` within its section, a `reference`, a Greek string and its matching English string. Missing translation is permitted for draft/sample units, with a clear UI fallback. Published sections need at least one unit with Greek and English.

```json
{
  "id": "lines-1-3",
  "reference": "22.1–3",
  "line_start": 1,
  "line_end": 3,
  "greek": "[Verified Greek for exactly these lines]",
  "translation": "[Matching literal translation]",
  "glosses": [{"greek": "[headword]", "english": "[meaning]"}],
  "grammar_notes": [{"topic_id": "grammar-example", "note": "[annotation]"}]
}
```

Numeric unit ranges are optional, but if present must increase without overlap and lie inside the parent section's range. A section's optional `lines` array contains `{ "id": "l1", "number": 1, "text": "[original verse]", "speaker": "[optional name]" }`. Line numbers must be consecutive and match the section start/end. Intentionally non-contiguous set-text selections belong in separate sections (as with Electra's existing gap).

Electra retains section alignment because the supplied English is not line-for-line. Its Greek verse bookmarks use stable IDs such as `electra-1:l1`. Herodotus 7 retains numbered subsection units such as `herodotus-209:p2`. Preserve these identifiers where the same material remains, to retain bookmarks and recall drafts.

### Grammar and assistance fields

- `examples`: objects with `greek` and `english` strings.
- `exercises`: objects with stable `id`, `prompt`, and `answer` strings. Exercise IDs must be unique within the topic. Draft answers use these IDs, so reordering does not move a user's answer to a different question.
- `glosses` (unseen/units) and `vocabulary` (composition): objects with `greek` and `english` strings.
- `hints`, `alternatives`, `points`, `quotations`, `section_ids`, `related_ids`, `topic_ids`: arrays of strings.

## Prompt to give the separate content workflow

> Prepare a UTF-8 JSON import bundle for GreekLabs using the accompanying CONTENT_IMPORT.md and content-bundle.json template. Return schema_version 1 and only the collections needed. Use stable IDs; preserve existing text and section IDs when updating them. Supply exact references and source attributions. Use literal English translations and explicit Greek/English reading units. Clearly distinguish original, adapted and newly composed Greek. Set status to draft until reviewed. Do not include HTML, API credentials, frontend code or invented source quotations. Never present a placeholder as published material. Include all retained fields when intentionally replacing an existing record. Content quality and attribution must be checked separately before publication.

The validator checks structure, duplicates, foreign references, status values, required content and numbering. It does not verify ancient sources, scholarly interpretation, copyright permissions, OCR syllabus accuracy or translation quality.
