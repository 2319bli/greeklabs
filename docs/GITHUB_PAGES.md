# GitHub Pages

- Website: <https://2319bli.github.io/greeklabs/>
- Repository: <https://github.com/2319bli/greeklabs>
- Deployments: <https://github.com/2319bli/greeklabs/actions/workflows/pages.yml>

## How it works

GitHub Pages serves static files. The workflow runs `python manage.py export_pages` to render the existing Django template into `_site/index.html`, copy public assets and write the validated content catalogue to `_site/data/catalog.json`. The browser uses that JSON instead of the local Django API. All asset and catalogue paths are relative, so the `/greeklabs/` project path works without special frontend routing. Navigation uses hash links and can be bookmarked or refreshed directly.

Only the generated `_site/` directory is deployed. The source repository excludes `.env`, SQLite, `.venv`, private backups, local browser test artifacts and generated archives. The website contains the supplied catalogue, including explicitly labelled drafts and samples. Django administration, database access and content import commands run locally, not on Pages.

## Publish an update

Make changes in this checkout. For new educational content, follow [CONTENT_IMPORT.md](CONTENT_IMPORT.md), validate a bundle, then apply it locally:

```sh
source .venv/bin/activate
python manage.py import_content path/to/bundle.json
python manage.py import_content path/to/bundle.json --apply
python manage.py validate_content
git add data/content/catalog.json
git commit -m "Update revision content"
git push origin main
```

Push code changes in the same way, adding only the intended changed files. The **Deploy GreekLabs to GitHub Pages** workflow checks Django, validates content, runs Python and JavaScript tests, exports the site and publishes it. A failed check prevents deployment. Pull requests run the build and tests without publishing. The workflow can also be started with **Actions → Deploy GreekLabs to GitHub Pages → Run workflow**.

Repository **Settings → Pages → Build and deployment → Source** must be **GitHub Actions**. The deployment uses GitHub's built-in workflow token; no personal token or API key belongs in the source or repository secrets.

## Preview the exported site locally

```sh
python manage.py export_pages
python -m http.server 8001 --bind 127.0.0.1 --directory _site
```

Open <http://127.0.0.1:8001/>. Stop with Ctrl+C. Do not open `index.html` directly using a `file://` URL: JavaScript modules and catalogue fetching need an HTTP server. `--output path/to/empty-directory` selects a different export directory. Rebuilds replace only an empty directory or an earlier marked GreekLabs export; validation failure leaves the previous export intact.

The Django development server continues to work as documented in the main README.

## Progress and troubleshooting

Browser progress is tied to the origin. To transfer local progress, open the old local address, choose **Dashboard → Export progress**, then choose **Import progress** on the Pages site. Imports preserve unrelated records and merge newer records. Repeat export/import to move between devices; there is no account sync.

If the page has not updated, check the workflow run has finished successfully and reload. A new content import requires a commit and push; changing local files alone cannot update Pages. If a deployment fails, inspect the failing Actions step. The previous successful deployment remains live. If the catalogue cannot load, check `data/catalog.json` exists in the exported artifact and that Pages uses GitHub Actions.
