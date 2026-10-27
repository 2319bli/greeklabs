# GreekLabs

A local Classical Greek revision platform built on the original Django and plain JavaScript app. Literature, language, unseen translation, composition and a unified dashboard share one content catalogue and persistent browser progress. There is no integrated AI provider, marking service, paid dependency or frontend build step.

**Website:** [2319bli.github.io/greeklabs](https://2319bli.github.io/greeklabs/) · **Source:** [2319bli/greeklabs](https://github.com/2319bli/greeklabs)

## GitHub Pages

The same application also runs as a static website on GitHub Pages. Every push to `main` runs the content checks and tests, exports the site, and deploys it automatically. No Django server, database or API key runs on Pages. See [docs/GITHUB_PAGES.md](docs/GITHUB_PAGES.md) for publishing, local previews and troubleshooting.

To move existing local progress to the website, export it from the local Dashboard, then import that JSON backup in the website's Dashboard. Progress stays in the browser; it is not uploaded to GitHub or synced between devices.

## Run locally

From this project directory (Python 3.10–3.14):

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py validate_content
python manage.py runserver 127.0.0.1:8000
```

Open **http://127.0.0.1:8000/revision/**. Stop with Ctrl+C. On the original refurbished checkout the virtual environment is already installed, so `.venv/bin/python manage.py runserver 127.0.0.1:8000` is enough. Internet access is needed to install Django initially; normal study then uses only the local server and bundled files. No npm install is needed.

If your old progress was stored at `http://localhost:8000`, use **that same hostname and port** for migration. Browser storage is origin-specific. `localhost` and `127.0.0.1` are different origins. Export/import progress through Dashboard to move between browsers, addresses or devices.

Django was upgraded within the existing stack to 5.2 LTS (tested with 5.2.18). [Django's 5.2 release documentation](https://docs.djangoproject.com/en/5.2/releases/5.2/) describes its supported Python versions and support period. No frontend framework was introduced.

## What is preserved and repaired

- All **15 Electra sections** (lines 1–85 and 254–416) and **20 Herodotus Book 7 chapters** (207–226), including every supplied Greek and English section body.
- Original `.txt` files remain byte-for-byte unchanged; `data/source-checksums.json` records their hashes.
- Greek/English reading, reveal/recall, a difficult-passage bank, literary style, 15-marker planning and coloured progress grids.
- Legacy `greekRevisionProgress` is retained and copied into a separate version 2 store. Historical perfect-test/essay counters and weak sentences are preserved as legacy data; they are not reinterpreted as reliable new marks.
- Electra English now loads: both the original incorrect directory and unsupported `Section N` translation headers were fixed by migration.
- Incorrect sentence/translation pairings, hard-coded text grids, stale recall indices, erased drafts, unescaped annotation HTML and missing-content handling were addressed.
- External AI and heuristic grading routes were retired. Requests to the old marking endpoints return 404. The OpenAI dependency and old frontend marker calls were removed.

## New functionality

- Literature collection pages for Electra, Herodotus 7, Odyssey 22 (1–238) and Herodotus 8 (6–26).
- Greek/English visibility controls; adjustable polytonic Greek size; numbered Electra verses; section and reading-unit bookmarks; previous/next navigation; learned status; Easy/Medium/Difficult self-assessment.
- Herodotus recall by matching numbered subsections, with current-section, whole-text and difficult-passage scopes.
- Importable literary annotations and essay question banks, revealable analysis/guidance, saved plans and drafts, and copy-for-external-review controls.
- Searchable grammar navigation, related-topic links, worked examples and practice support, and vocabulary flashcards.
- Filtered/paginated unseen and composition libraries, exercise navigation, hints, glosses, model answers, alternative constructions, saved drafts and completion tracking.
- Search across all collections by Greek/English, text, author, genre, difficulty, topic, content state, progress and bookmarks. Greek matching ignores diacritics and normalises final sigma.
- Unified dashboard, recents, bookmarks, confidence, independent progress per collection, versioned backups and additive restore.
- Responsive light/dark design, keyboard access, a working skip link, focus indicators, semantic controls and no external fonts or runtime CDNs.
- Versioned JSON imports with duplicate detection, required-field checks, reference and line-number validation, dry-run default, import locking, automatic backup and atomic save.

## Content imports

See **[docs/CONTENT_IMPORT.md](docs/CONTENT_IMPORT.md)** and **[docs/examples/content-bundle.json](docs/examples/content-bundle.json)** for the complete format and a prompt for a separate GPT content workflow.

```sh
python manage.py import_content path/to/bundle.json           # validate only
python manage.py import_content path/to/bundle.json --apply   # save with backup
```

Use `--replace-existing` only for intentional updates to existing IDs. Imports never delete omitted records. Keep stable text, section, reading-unit and grammar-exercise IDs to preserve associated progress. New records appear on browser reload without changing frontend code.

## Intentionally awaiting content

- Odyssey 22 and Herodotus 8 have prepared collection pages with no invented Greek or translations.
- No verified style annotations or essay questions were supplied; those banks show clear empty states and are ready for import. Personal essay plans can still be written.
- Language currently has two labelled demonstration topics and one demonstration vocabulary card.
- Unseen and composition each contain two labelled interface demonstrations with empty source/model fields. No hundreds of fake passages were generated. Demo activity is excluded from study totals.
- Original English is retained as supplied, not certified as a literal or accurate translation. Electra's translation is aligned by section because its line breaks do not match Greek verses; verified finer alignment can be imported. Herodotus uses its existing numbered subsections.

## Progress and privacy

Progress lives in **this browser**, not SQLite or a cloud account. Every item uses an independent `greekLabs:v2:entry:<collection>:<id>` key. Rendering does not mark an item completed. Export a backup before clearing browser data, changing origin or moving devices. Restore validates the entire backup first, keeps a pre-import recovery copy, and merges newer records without deleting unrelated entries. Storage failures show a persistent warning and retain the current tab's changes in memory for export. Corrupt originals and unknown newer-version records are preserved.

The original private `.env` is untouched, ignored by source sharing and **not loaded**. API keys are never needed. `.env.example` now contains only safe optional Django settings. `DJANGO_SECRET_KEY` is optional for local study; without it, a new local Django signing key is generated at startup (admin sessions may need a fresh login). Do not publicly expose the development server.

The original recovery archive is `backups/original-2026-10-27.tar.gz` in this checkout. Environment files were excluded and the old hard-coded Django secret was redacted. It contains the original SQLite database and should remain private. The shareable `GreekLabs-2.0.zip` excludes the private environment, database, recovery archive, virtual environment and browser test artifacts. Run `migrate` to create a fresh SQLite database after extracting the shareable archive.

## Architecture

| Location | Responsibility |
| --- | --- |
| `config/`, `core/`, `revision/` | Django configuration, routing and page shell |
| `texts/catalog.py` | Catalogue reading, validation and merge rules |
| `texts/management/commands/` | Validate and safely import content |
| `data/content/catalog.json` | Runtime educational catalogue |
| `static/js/main.js` | Navigation, event handling and application state |
| `static/js/literature.js` | Literature collections, reader, recall, analysis and essay views |
| `static/js/libraries.js` | Language, vocabulary, exercises and unified search |
| `static/js/progressStore.js` | Persistent progress, migration, export and restore |
| `static/js/dashboard.js` | Dashboard and activity resolution |
| `static/css/app.css` | Responsive themes and shared component styles |
| `scripts/migrate_legacy_content.py` | One-time lossless legacy conversion; refuses overwrite |
| `scripts/package_release.py` | Shareable source ZIP from an explicit safe file list |
| `texts/management/commands/export_pages.py` | Validated static export with relative asset and content URLs |
| `.github/workflows/pages.yml` | Tests, static build and GitHub Pages deployment |

The catalogue is approximately 210 KB over the API with the supplied content. The browser loads it once and filters locally; hundreds of exercises are supported and tested. Very large libraries would benefit from server-side pagination/search later.

## Tests and known limits

```sh
python manage.py check
python manage.py validate_content
python manage.py test
node --test tests/*.test.js     # optional Node 18+; no npm dependencies
```

See [docs/QA.md](docs/QA.md) for test coverage and browser checks, and [docs/AUDIT.md](docs/AUDIT.md) for the original audit.

No automatic translation, composition or essay grading; no on-demand generation; no account sync. Academic content quality is a separate review step. Progress cannot survive deliberate browser-data deletion without an exported backup. The import command uses POSIX file locking (macOS/Linux; use WSL on Windows). The browser checks cover the supplied in-app browser, not a full cross-browser certification. The public website uses GitHub Pages; no paid services are required.
