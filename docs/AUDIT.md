# Original project audit — 27 October 2026

The supplied folder was already extracted. No project archive or Git history was present. Inspected the Django apps, all frontend modules/templates, source text formats, configuration (without printing secret values), dependency versions, and SQLite table inventory.

## Architecture and retained material

Django 4.2 with core/revision page routes, a texts JSON API, and an ai_marking API. Plain ES modules; inline template CSS; no frontend build tooling. SQLite contains Django auth/session/admin tables only, with no educational content or revision records. Progress lives in browser localStorage under `greekRevisionProgress`.

Retain Django, SQLite, vanilla JavaScript, original UTF-8 text files, 15 Electra sections and Herodotus 7 chapters 207–226, Greek/English reading, text hiding, recall, style and essay interfaces, and the coloured progress grid. The root and data copies of the three duplicated source files are byte-identical. Electra's translation exists only at the root.

## Defects found

- Electra English never loads: wrong directory AND its `Section N` headers are not normalised by the translation parser.
- Greek lines and English line breaks are treated as aligned sentences despite mismatched boundaries. Whole translations are sometimes used as answers to individual Greek lines.
- Profile hard-codes section IDs, writes progress during rendering, and ignores new text IDs.
- Sentence index can carry over between sections. Essay and translation drafts are cleared on rerenders.
- Style is placeholder material interpolated into HTML without escaping. Essay questions are generated generic placeholders, not a verified bank.
- Translation marking calls an external API, falls back to keyword overlap, and can expose provider errors. Essay scores are based on answer length and crude heuristics. These must be retired, not preserved as assessment.
- No automated tests, content validation, import contract, persistent draft handling, unified search, light theme, or robust storage error handling.
- `.env.example` contains credential-style configuration; it must be replaced with a safe example. The private `.env` is left untouched and will not be loaded by the application.
- Django 4.2 is outside its support period. Upgrade within Django to the 5.2 LTS series, compatible with the existing Python 3.14 interpreter.

## Preservation strategy

`backups/original-2026-10-27.tar.gz` contains the original application and SQLite database. Environment files are excluded and the hard-coded Django secret is redacted. This is a private local recovery archive, ignored from source sharing. Original educational text files remain unchanged; their SHA-256 checksums are recorded in `backups/source-text-checksums.json`.

A versioned JSON catalogue becomes the sole runtime content source. Import existing text losslessly into section records; preserve original text bodies as well as explicit reading units. Use Herodotus's numbered subsections for alignment. Electra's English does not follow verse boundaries: retain section alignment explicitly rather than infer false line pairs. Provide Greek verse numbering/bookmarks and support supplied verified smaller alignment units later.

Keep the legacy browser key unchanged. Migrate its data into a separate versioned namespace with the original records retained. Old AI-derived scores are historical data, not current confidence assessments.
