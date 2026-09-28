# GradConnect Hackathon Crawler

This Scrapy project scans only the URLs that an administrator has enabled in GradConnect.
Crawler results are sent to the staging/review API and are not published until an admin approves them.

## Local development

The crawler can still be run locally with the root GradConnect `.env` file:

- `GRADCONNECT_API_URL=http://localhost:3000`
- `HACKATHON_IMPORT_TOKEN=<local shared secret>`

Start the local app and run the crawler with the normal Scrapy/Scrapyd development workflow.

## Production

Production uses GitHub Actions. The workflow authenticates to GradConnect using GitHub Actions OIDC, so no shared `HACKATHON_IMPORT_TOKEN` repository secret is required in GitHub.

Required GitHub Actions repository secret:

- `GRADCONNECT_API_URL` - the live GradConnect Vercel URL

The workflow needs `id-token: write`, which is already configured in `.github/workflows/hackathon-crawler.yml`.

Vercel still needs `GITHUB_CRAWLER_TOKEN` so the GradConnect admin button and cron route can dispatch the GitHub workflow.
