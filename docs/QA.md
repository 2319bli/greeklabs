# Quality assurance — 27 October 2026

## Environment and results

- Python 3.14 virtual environment, Django **5.2.18**, SQLite, ES modules and local CSS.
- `python manage.py check`: passed with no issues.
- `python manage.py validate_content`: passed (4 texts, 35 literature sections, 2 grammar demos, 1 vocabulary demo, 2 unseen demos, 2 composition demos).
- `python manage.py test`: **17 tests passed**, including static-export checks.
- `node --test tests/*.test.js`: **11 tests passed**, no third-party test packages.
- `python manage.py migrate --check`: no outstanding migrations.
- Local page and catalogue HTTP checks: 200. Retired marking endpoints: 404. Invalid catalogue: safe 503.
- Clean extracted release: Django checks, catalogue validation and fresh SQLite migrations all passed using the installed project dependencies.
- Example future content bundle: dry-run import passed; no example data installed.

## Automated coverage

Every original Greek/English section body matches its source. Source text checksums match, and the SQLite database matches the original recovery archive byte-for-byte. All Electra verse sequences agree with their original range headers; Herodotus 209 retains five matching subsections, including the multiline English speech in subsection 2.

Validation tests cover required fields, malformed types, duplicate identifiers and JSON properties, numbering, foreign references, wrong-text annotations, invalid unit references, incomplete published records, safe merging, dry-run imports, explicit replacement, automatic backups and no partial writes on rejection. Synthetic data in temporary test memory verifies imports and pagination for **200 unseen and 200 composition exercises**; these fixtures are not present in the educational catalogue.

Frontend tests cover accent/decomposition/final-sigma search, all 35 sections in every literature mode, empty/demo pages, supplied future annotations/questions/models, HTML escaping, matching recall chunks, difficult-passage filtering, cursor bounds, independent drafts, legacy migration, corruption recovery, future-version protection, storage quota fallback, additive progress restore and line-bookmark search.

## Browser checks

Tested in the connected in-app browser against `127.0.0.1:8000`:

- Literature overview and all four text landing pages; Odyssey 22 and Herodotus 8 show honest empty states.
- Electra section 1 displays all 14 numbered polytonic verses and the previously inaccessible English translation.
- Greek and English hide/show independently. Greek-size changes persist after reload.
- Section completion and verse bookmarks persist after reload; test completion/bookmark toggles were returned to their prior state.
- Herodotus 209 reveals only the matching subsection, advances to the next chunk with English hidden again, and supports adding/removing a difficult-passage rating.
- Essay plans/responses survive reload. Test draft text was cleared afterwards.
- Unseen difficulty filtering, reset, attempts, completion, draft persistence and next exercise navigation.
- Composition draft persistence; model-answer/hint disclosures and clear missing-material states.
- Grammar topic navigation and related-topic links; vocabulary meaning reveal.
- Global search for unaccented `αργος` finds Electra's `Ἄργος`.
- Progress export downloads a JSON file; importing that same backup succeeds and leaves newer/unrelated records unchanged.
- Keyboard activation of the skip link focuses main content without breaking the route; select controls retain focus through filtering.
- Mobile navigation and both light/dark themes.

Measured CSS viewport widths **320, 768 and 1366 px**: Literature, both new text landing pages, Language, Unseen, Composition, Dashboard and the Electra reader all render without horizontal overflow. The mobile reader stacks Greek and English; desktop uses parallel columns. Screenshots: `docs/preview-desktop.jpg`, `docs/preview-mobile.jpg`.

A template-expression startup error found during browser testing was repaired. Subsequent navigation checks reported no new console errors. Browser testing used demo entries and a few original sections for controls; no educational material was modified. Recents may reflect these QA visits, and demo progress may reflect demonstration testing (excluded from study totals).

## Security and delivery

The application does not load the private `.env`, import an AI SDK, call marking services, or fetch external fonts/scripts. Runtime source, templates and documentation passed a credential-pattern scan without printing secret values. The release packager uses an explicit allowlist and excludes `.env`, the database, virtual environment, private original archive and import recovery backups. GitHub Pages deployment was added at the user's subsequent request.

## Static export

Three additional Python tests verify that the static catalogue exactly matches the validated source, all asset URLs resolve under a GitHub project path, exported assets match their source, private files are excluded, repeated exports work, Django's original asset/API paths remain unchanged, invalid content leaves a prior export intact and the exporter refuses to overwrite source or unmanaged directories.

The GitHub Actions workflow repeats application checks, catalogue validation and all 28 tests before deploying the generated static site.

The [first GitHub build and deployment](https://github.com/2319bli/greeklabs/actions/runs/40600616992) succeeded. HTTPS is enforced on [the live website](https://2319bli.github.io/greeklabs/). Live HTML, CSS, JavaScript and catalogue bytes match the tested export. Browser checks passed for direct reader-link reloads, Herodotus translation reveal, literature navigation, both empty new-text collections, language, unseen, composition, dashboard and unaccented Greek search. The 390 px mobile view has no horizontal overflow, and these live checks recorded no browser console errors. Section completion also survived a reload of the static local preview; the test completion was reverted afterwards.

## Limits

Academic accuracy and provenance were not revalidated; existing translations remain as supplied. Electra needs separately supplied finer Greek/English alignment. New texts, verified grammar/exercises, annotations and exam questions still await import. Browser data requires exports for migration or recovery after deliberate deletion; there is no cloud sync. Testing is local and does not represent certification across every browser or real mobile device. The local testing server is stopped after handover; use the README run command to restart it.
