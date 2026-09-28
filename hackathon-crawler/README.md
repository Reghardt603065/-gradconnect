# GradConnect Hackathon Crawler

The crawler is a normal Scrapy project. Production runs it on demand through GitHub Actions, so GradConnect does not need Railway, Docker, Scrapyd, an always-on PC, or any terminal commands after deployment.

## Production flow

The GitHub Actions workflow is stored at:

`.github/workflows/hackathon-crawler.yml`

It starts in two ways:

- An admin presses **Run crawler** on `/admin/hackathon-crawler`.
- Vercel Cron calls `/api/cron/hackathon-crawler` once per day, which dispatches the same GitHub Actions workflow.

The workflow starts a temporary GitHub runner, installs `hackathon-crawler/requirements.txt`, runs `scrapy crawl hackathon_spider`, sends discovered events to GradConnect's staging API, and then shuts down automatically.

Crawler results never publish themselves. They remain in the crawler review queue until an admin approves them.

## GitHub Actions repository secrets

Configure these in the GitHub repository under **Settings -> Secrets and variables -> Actions**:

- `GRADCONNECT_API_URL` - the live Vercel production URL, for example `https://your-project.vercel.app`
- `HACKATHON_IMPORT_TOKEN` - the same secret value configured in Vercel

## Vercel production environment variables

Required:

- `HACKATHON_IMPORT_TOKEN`
- `GITHUB_CRAWLER_TOKEN` - a fine-grained GitHub token restricted to this repository with Actions read/write permission
- `CRON_SECRET`

Optional because the project already has defaults:

- `GITHUB_CRAWLER_REPOSITORY=Reghardt603065/-gradconnect`
- `GITHUB_CRAWLER_WORKFLOW=hackathon-crawler.yml`
- `GITHUB_CRAWLER_REF=main`

## Local development

The production crawler does not use Scrapyd. If you want to test only the Python crawler locally, activate your Python environment and run `scrapy crawl hackathon_spider` from the `hackathon-crawler` folder.
