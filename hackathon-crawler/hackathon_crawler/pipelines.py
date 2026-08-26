# Scraped items get saved here.
# The original crawler wrote directly to SQL Server. GradConnect already uses
# Prisma/PostgreSQL, so this keeps the same pipeline idea but sends items to
# the app's protected import API instead of creating a second DB connection.
import json
import os
from urllib import request as urllib_request


class GradConnectApiPipeline:
    def open_spider(self, spider):
        self.api_url = os.getenv("GRADCONNECT_API_URL", "http://localhost:3000").rstrip("/")
        self.token = os.getenv("HACKATHON_IMPORT_TOKEN", "")
        if not self.token:
            spider.logger.warning("HACKATHON_IMPORT_TOKEN is not configured; imports will fail")

    def process_item(self, item, spider):
        payload = json.dumps(dict(item)).encode("utf-8")
        req = urllib_request.Request(
            f"{self.api_url}/api/internal/hackathons/import",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}",
            },
        )
        try:
            with urllib_request.urlopen(req, timeout=20) as response:
                if response.status not in (200, 201):
                    spider.logger.error("GradConnect import returned HTTP %s", response.status)
        except Exception as exc:
            spider.logger.error("Failed to import hackathon into GradConnect: %s", exc)
        return item
