# GradConnect Hackathon Crawler

This is the Python crawler used by the normal GradConnect project. It scans admin-approved URLs, stages discovered hackathons for admin review, and never publishes directly to the live Hackathon table.

The same crawler code is used locally and when the project is deployed. There is no Docker requirement and there is no separate demo build.

## Main files

- `hackathon_crawler/spiders/hackathon_spider.py` - scans approved URLs and extracts event details.
- `hackathon_crawler/pipelines.py` - sends results to the GradConnect staging API.
- `hackathon_crawler/config.py` - reads the shared GradConnect environment values.
- `requirements.txt` - Python dependencies.
- `scrapy.cfg` - Scrapy/Scrapyd project configuration.

## Local environment

The crawler automatically checks the parent GradConnect project for the normal root `.env` file. Keep the crawler settings there with the rest of the project settings:

```env
HACKATHON_IMPORT_TOKEN="your-shared-secret"
HACKATHON_SCRAPYD_URL="http://localhost:6800"
HACKATHON_SCRAPYD_PROJECT="hackathon_crawler"
GRADCONNECT_API_URL="http://localhost:3000"
```

`HACKATHON_SCRAPYD_USERNAME` and `HACKATHON_SCRAPYD_PASSWORD` are optional. Leave them unset for the normal local Scrapyd setup.

## First local setup

From `hackathon-crawler`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Normal local run

Terminal 1, from the GradConnect root:

```powershell
npm run dev
```

Terminal 2, from `hackathon-crawler`:

```powershell
.\.venv\Scripts\Activate.ps1
scrapyd
```

Terminal 3, only when the crawler has not been deployed to the current Scrapyd instance or its Python code changed:

```powershell
.\.venv\Scripts\Activate.ps1
scrapyd-deploy
```

The live GradConnect admin page can then use the **Run crawler** button.

## Direct crawler test

You can bypass Scrapyd and run the spider directly:

```powershell
scrapy crawl hackathon_spider
```

## Deployment later

Do not commit `.env` or `.venv`.

The Next.js application reads `HACKATHON_SCRAPYD_URL`, so the same code works with either:

```text
http://localhost:6800
```

or a hosted Scrapyd URL.

The hosted Python service should install `requirements.txt`, provide `GRADCONNECT_API_URL` and `HACKATHON_IMPORT_TOKEN` as environment variables, start Scrapyd, and deploy this same Scrapy project to that Scrapyd instance. No source-code rewrite is required.
