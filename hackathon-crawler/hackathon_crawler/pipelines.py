import json
import logging
from urllib import request as urllib_request

from hackathon_crawler.config import get_crawler_auth_headers, get_gradconnect_api_url


logger = logging.getLogger(__name__)


class GradConnectApiPipeline:
    """Send crawler output into GradConnect's staging/review API.

    This pipeline deliberately writes only to the staging table.
    The Next.js admin review flow publishes an event to the live Hackathon
    table only after an administrator approves it.
    """

    def open_spider(self):
        self.api_url = get_gradconnect_api_url()

    def process_item(self, item):
        auth_headers = get_crawler_auth_headers()
        if not auth_headers:
            raise RuntimeError(
                "Crawler authentication is unavailable. GitHub Actions should "
                "provide OIDC automatically; local runs can use HACKATHON_IMPORT_TOKEN."
            )

        payload = json.dumps(dict(item)).encode("utf-8")
        api_request = urllib_request.Request(
            f"{self.api_url}/api/internal/hackathons/import",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                **auth_headers,
                "User-Agent": "GradConnectHackathonCrawler/1.0",
            },
        )

        try:
            with urllib_request.urlopen(api_request, timeout=20) as response:
                if response.status not in (200, 201):
                    raise RuntimeError(
                        f"GradConnect staging import returned HTTP {response.status}"
                    )

                logger.info(
                    "Staged crawler result: %s",
                    item.get("name"),
                )
        except Exception as exc:
            logger.error(
                "Failed to stage hackathon result in GradConnect: %s",
                exc,
            )
            raise

        return item
