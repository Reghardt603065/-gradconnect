import json
import os
from urllib import request as urllib_request

import scrapy

from hackathon_crawler.items import HackathonItem


class HackathonSpider(scrapy.Spider):
    name = "hackathon_spider"

    def start_requests(self):
        for url in self._load_targets():
            yield scrapy.Request(url, callback=self.parse)

    def _load_targets(self):
        api_url = os.getenv("GRADCONNECT_API_URL", "http://localhost:3000").rstrip("/")
        token = os.getenv("HACKATHON_IMPORT_TOKEN", "")
        req = urllib_request.Request(
            f"{api_url}/api/internal/hackathons/crawl-targets",
            headers={"Authorization": f"Bearer {token}"},
        )
        try:
            with urllib_request.urlopen(req, timeout=20) as response:
                body = json.loads(response.read().decode("utf-8"))
                return body.get("data", [])
        except Exception as exc:
            self.logger.error("Could not load crawl targets from GradConnect: %s", exc)
            fallback = os.getenv("HACKATHON_CRAWL_TARGETS", "")
            return [url.strip() for url in fallback.split(",") if url.strip()]

    def parse(self, response):
        # Prefer schema.org Event JSON-LD because it is much more reliable than
        # guessing arbitrary CSS card layouts on every website.
        found = False
        for script in response.css('script[type="application/ld+json"]::text').getall():
            try:
                payload = json.loads(script)
            except json.JSONDecodeError:
                continue

            objects = payload if isinstance(payload, list) else [payload]
            for obj in objects:
                if isinstance(obj, dict) and obj.get("@graph"):
                    objects.extend(item for item in obj["@graph"] if isinstance(item, dict))

            for obj in objects:
                if not isinstance(obj, dict):
                    continue
                event_type = obj.get("@type")
                types = event_type if isinstance(event_type, list) else [event_type]
                if not any(str(value).lower().endswith("event") for value in types if value):
                    continue

                name = str(obj.get("name") or "").strip()
                if not name:
                    continue
                found = True
                yield HackathonItem(
                    name=name,
                    description=self._clean_description(obj.get("description")),
                    start_date=obj.get("startDate"),
                    end_date=obj.get("endDate"),
                    source_url=str(obj.get("url") or response.url),
                )

        if found:
            return

        # Lightweight fallback for pages without Event JSON-LD. This deliberately
        # stores incomplete dates as null so an admin can review the discovery
        # instead of publishing bad dates automatically.
        for card in response.css("article, .event, .hackathon, [class*='event-card'], [class*='hackathon-card']"):
            name = card.css("h1::text, h2::text, h3::text, [class*='title']::text").get()
            if not name or not name.strip():
                continue
            description = " ".join(card.css("p::text").getall()).strip() or None
            href = card.css("a::attr(href)").get()
            yield HackathonItem(
                name=name.strip(),
                description=description,
                start_date=None,
                end_date=None,
                source_url=response.urljoin(href) if href else response.url,
            )

    @staticmethod
    def _clean_description(value):
        if isinstance(value, str):
            return " ".join(value.split())
        return None
