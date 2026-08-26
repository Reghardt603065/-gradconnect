# GradConnect Hackathon Crawler

This folder is adapted from the supplied Hackathon Crawler project. The original crawler pipeline wrote directly to a SQL Server database. GradConnect uses Prisma with PostgreSQL, so the crawler now imports discovered events through GradConnect's protected internal API.

## Environment

Set these for both the GradConnect app and the crawler where appropriate:

- `HACKATHON_IMPORT_TOKEN` - shared secret used by the crawler import/target APIs.
- `GRADCONNECT_API_URL` - crawler-side app URL, e.g. `http://localhost:3000`.
- `HACKATHON_SCRAPYD_URL` - app-side Scrapyd URL, defaults to `http://localhost:6800`.

## Local run

```bash
pip install -r requirements.txt
scrapyd
```

In another terminal, deploy/run the spider with Scrapyd tooling, or test directly:

```bash
scrapy crawl hackathon_spider
```

Add crawl targets from the GradConnect Hackathons admin section. Discovered events stay pending until an admin approves them.
