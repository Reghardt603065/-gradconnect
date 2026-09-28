import json
import os
import re
from urllib import request as urllib_request

import scrapy

from hackathon_crawler.config import get_crawler_auth_headers, get_gradconnect_api_url
from hackathon_crawler.items import HackathonItem


MONTH_PATTERN = (
    r"January|February|March|April|May|June|July|August|"
    r"September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|"
    r"Aug|Sep|Sept|Oct|Nov|Dec"
)


class HackathonSpider(scrapy.Spider):
    name = "hackathon_spider"

    async def start(self):
        """Load admin-approved targets and schedule them for crawling."""
        targets = self._load_targets()

        if not targets:
            self.logger.warning(
                "No active crawl targets were returned. Add and enable a URL in "
                "GradConnect at /admin/hackathon-crawler."
            )
            return

        self.logger.info("Loaded %s active crawl target(s)", len(targets))

        for url in targets:
            yield scrapy.Request(
                url,
                callback=self.parse,
                meta={"target_url": url},
            )

    def _load_targets(self):
        api_url = get_gradconnect_api_url()
        auth_headers = get_crawler_auth_headers()

        if not auth_headers:
            self.logger.error(
                "Crawler authentication is not available. GitHub Actions should "
                "provide OIDC automatically; local runs can use HACKATHON_IMPORT_TOKEN."
            )
            return self._fallback_targets()

        api_request = urllib_request.Request(
            f"{api_url}/api/internal/hackathons/crawl-targets",
            headers={
                **auth_headers,
                "User-Agent": "GradConnectHackathonCrawler/1.0",
            },
        )

        try:
            with urllib_request.urlopen(api_request, timeout=20) as response:
                body = json.loads(response.read().decode("utf-8"))
                targets = body.get("data", [])

                if not isinstance(targets, list):
                    self.logger.error("GradConnect returned an invalid crawl target list")
                    return self._fallback_targets()

                return [
                    str(url).strip()
                    for url in targets
                    if isinstance(url, str) and url.strip()
                ]
        except Exception as exc:
            self.logger.error(
                "Could not load crawl targets from GradConnect at %s: %s",
                api_url,
                exc,
            )

            fallback_targets = self._fallback_targets()
            if fallback_targets:
                self.logger.warning(
                    "Using %s HACKATHON_CRAWL_TARGETS fallback target(s)",
                    len(fallback_targets),
                )
                return fallback_targets

            raise RuntimeError(
                "GradConnect crawl-target authentication/request failed. "
                "Check GRADCONNECT_API_URL and the GitHub Actions OIDC configuration."
            ) from exc

    @staticmethod
    def _fallback_targets():
        fallback = os.getenv("HACKATHON_CRAWL_TARGETS", "")
        return [url.strip() for url in fallback.split(",") if url.strip()]

    def parse(self, response):
        """Extract event data using progressively broader strategies.

        Order matters:
        1. Schema.org Event JSON-LD (most reliable)
        2. Repeating event/hackathon cards
        3. Direct event page fallback (H1/title + visible date/location text)

        Nothing is written to the live Hackathon table. Every yielded item goes
        to the staging API for admin review.
        """
        target_url = response.meta.get("target_url", response.url)

        structured_items = list(self._extract_json_ld_events(response, target_url))
        if structured_items:
            self.logger.info(
                "Found %s structured Event item(s) on %s",
                len(structured_items),
                response.url,
            )
            yield from structured_items
            return

        card_items = list(self._extract_event_cards(response, target_url))
        if card_items:
            self.logger.info(
                "Found %s event card item(s) on %s",
                len(card_items),
                response.url,
            )
            yield from card_items
            return

        direct_item = self._extract_direct_event_page(response, target_url)
        if direct_item:
            self.logger.info(
                "Used direct-page fallback for %s",
                response.url,
            )
            yield direct_item
            return

        self.logger.warning(
            "No event data could be extracted from %s. The page was reached "
            "successfully, but it did not contain enough event-like information.",
            response.url,
        )

    def _extract_json_ld_events(self, response, target_url):
        for script in response.css('script[type="application/ld+json"]::text').getall():
            try:
                payload = json.loads(script)
            except (json.JSONDecodeError, TypeError):
                continue

            objects = payload if isinstance(payload, list) else [payload]
            expanded_objects = []

            for obj in objects:
                if not isinstance(obj, dict):
                    continue

                expanded_objects.append(obj)
                graph = obj.get("@graph")

                if isinstance(graph, list):
                    expanded_objects.extend(
                        item for item in graph if isinstance(item, dict)
                    )

            for obj in expanded_objects:
                if not self._is_event(obj):
                    continue

                name = self._clean_text(obj.get("name"))
                if not name:
                    continue

                yield HackathonItem(
                    name=name,
                    description=self._clean_description(obj.get("description")),
                    start_date=self._string_or_none(obj.get("startDate")),
                    end_date=self._string_or_none(obj.get("endDate")),
                    location=self._extract_location(obj.get("location")),
                    mode=self._extract_mode(obj.get("eventAttendanceMode")),
                    source_url=str(obj.get("url") or response.url),
                    target_url=target_url,
                )

    def _extract_event_cards(self, response, target_url):
        selectors = [
            "article",
            ".event",
            ".hackathon",
            "[class*='event-card']",
            "[class*='hackathon-card']",
            "[class*='event_item']",
            "[class*='event-item']",
            "[class*='eventCard']",
        ]

        seen = set()

        for card in response.css(", ".join(selectors)):
            name = self._first_text(
                card,
                [
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "[class*='title']",
                    "[class*='name']",
                ],
            )

            if not name or not self._looks_like_event_name(name):
                continue

            description = self._first_meaningful_paragraph(card)
            card_text = self._selector_text(card)
            start_date, end_date = self._extract_dates(card, card_text)
            location = self._extract_location_from_selector(card, card_text)
            mode = self._extract_mode_from_text(card_text, location)
            href = card.css("a::attr(href)").get()
            source_url = response.urljoin(href) if href else response.url

            key = (name.lower(), source_url.lower())
            if key in seen:
                continue
            seen.add(key)

            yield HackathonItem(
                name=name,
                description=description,
                start_date=start_date,
                end_date=end_date,
                location=location,
                mode=mode,
                source_url=source_url,
                target_url=target_url,
            )

    def _extract_direct_event_page(self, response, target_url):
        title = self._clean_text(
            response.xpath("string((//h1)[1])").get()
            or response.css('meta[property="og:title"]::attr(content)').get()
            or response.css("title::text").get()
        )

        if not title:
            return None

        body_text = self._page_text(response)
        if not self._looks_like_event_page(title, body_text):
            return None

        description = self._meta_description(response)
        if not description:
            description = self._first_meaningful_paragraph(response)

        start_date, end_date = self._extract_dates(response, body_text)
        location = self._extract_location_from_selector(response, body_text)
        mode = self._extract_mode_from_text(body_text, location)

        source_url = (
            response.css('link[rel="canonical"]::attr(href)').get()
            or response.css('meta[property="og:url"]::attr(content)').get()
            or response.url
        )
        source_url = response.urljoin(source_url)

        return HackathonItem(
            name=title,
            description=description,
            start_date=start_date,
            end_date=end_date,
            location=location,
            mode=mode,
            source_url=source_url,
            target_url=target_url,
        )

    def _extract_dates(self, selector, text):
        datetime_values = [
            self._clean_text(value)
            for value in selector.css("time::attr(datetime)").getall()
        ]
        datetime_values = [value for value in datetime_values if value]

        if datetime_values:
            return (
                datetime_values[0],
                datetime_values[1] if len(datetime_values) > 1 else None,
            )

        normalized = " ".join(text.split())

        day_month_range = re.search(
            rf"\b(\d{{1,2}})\s*[–—-]\s*(\d{{1,2}})\s+({MONTH_PATTERN})\s*,?\s*(\d{{4}})\b",
            normalized,
            re.IGNORECASE,
        )
        if day_month_range:
            first_day, second_day, month, year = day_month_range.groups()
            return (
                f"{first_day} {month} {year}",
                f"{second_day} {month} {year}",
            )

        month_day_range = re.search(
            rf"\b({MONTH_PATTERN})\s+(\d{{1,2}})\s*[–—-]\s*(\d{{1,2}})\s*,?\s*(\d{{4}})\b",
            normalized,
            re.IGNORECASE,
        )
        if month_day_range:
            month, first_day, second_day, year = month_day_range.groups()
            return (
                f"{first_day} {month} {year}",
                f"{second_day} {month} {year}",
            )

        single_day_month = re.search(
            rf"\b(\d{{1,2}})\s+({MONTH_PATTERN})\s*,?\s*(\d{{4}})\b",
            normalized,
            re.IGNORECASE,
        )
        if single_day_month:
            day, month, year = single_day_month.groups()
            return f"{day} {month} {year}", None

        single_month_day = re.search(
            rf"\b({MONTH_PATTERN})\s+(\d{{1,2}})\s*,?\s*(\d{{4}})\b",
            normalized,
            re.IGNORECASE,
        )
        if single_month_day:
            month, day, year = single_month_day.groups()
            return f"{day} {month} {year}", None

        return None, None

    def _extract_location_from_selector(self, selector, text):
        location_selectors = [
            "[class*='location']",
            "[class*='venue']",
            "[id*='location']",
            "[id*='venue']",
        ]

        for css_selector in location_selectors:
            for node in selector.css(css_selector):
                value = self._clean_text(self._selector_text(node))
                if value and 2 < len(value) <= 180:
                    return value

        chunks = self._visible_text_chunks(selector)

        # Strong local signal for the South African event pages used by GradConnect.
        for chunk in chunks:
            if re.search(r",\s*South Africa\b", chunk, re.IGNORECASE) and 2 < len(chunk) <= 120:
                return chunk

        for chunk in chunks:
            lowered = chunk.lower()
            if (
                any(word in lowered for word in ["campus", "convention centre", "convention center", "university"])
                and 2 < len(chunk) <= 140
            ):
                return chunk

        normalized = " ".join(text.split())
        labelled = re.search(
            r"(?:location|venue|where)\s*[:\-]?\s*([^.;|]{3,120})",
            normalized,
            re.IGNORECASE,
        )
        if labelled:
            return self._clean_text(labelled.group(1))

        south_africa = re.search(
            r"\b([A-Z][A-Za-zÀ-ÿ'’.-]*(?:\s+[A-Z][A-Za-zÀ-ÿ'’.-]*){0,5},\s*South Africa)\b",
            normalized,
        )
        if south_africa:
            return self._clean_text(south_africa.group(1))

        return None

    @staticmethod
    def _extract_mode_from_text(text, location=None):
        lowered = text.lower()

        if "hybrid" in lowered:
            return "HYBRID"

        online_terms = ["online", "virtual", "microsoft teams", "ms teams", "zoom"]

        # A concrete venue is a stronger signal than unrelated online wording
        # elsewhere on a long event page (for example webinar announcements).
        if location and not any(term in location.lower() for term in online_terms):
            return "IN_PERSON"

        if any(term in lowered for term in online_terms):
            return "ONLINE"

        return None

    @staticmethod
    def _looks_like_event_name(name):
        lowered = name.lower()
        keywords = [
            "hackathon",
            "hack prix",
            "hack day",
            "hackfest",
            "codefest",
            "innovation challenge",
            "coding challenge",
        ]
        return any(keyword in lowered for keyword in keywords)

    def _looks_like_event_page(self, title, body_text):
        if self._looks_like_event_name(title):
            return True

        sample = body_text[:6000].lower()
        event_keywords = [
            "hackathon",
            "hack prix",
            "hackfest",
            "coding competition",
            "innovation challenge",
        ]
        return any(keyword in sample for keyword in event_keywords)

    @staticmethod
    def _is_event(obj):
        if not isinstance(obj, dict):
            return False

        event_type = obj.get("@type")
        types = event_type if isinstance(event_type, list) else [event_type]

        return any(
            str(value).lower().endswith("event")
            for value in types
            if value
        )

    @staticmethod
    def _clean_description(value):
        if isinstance(value, str):
            return " ".join(value.split())[:4000] or None
        return None

    @staticmethod
    def _string_or_none(value):
        if value is None:
            return None
        return str(value).strip() or None

    @staticmethod
    def _extract_mode(value):
        if not value:
            return None

        text = str(value).lower()

        if "online" in text:
            return "ONLINE"
        if "mixed" in text or "hybrid" in text:
            return "HYBRID"
        if "offline" in text or "physical" in text:
            return "IN_PERSON"

        return str(value)

    @staticmethod
    def _extract_location(value):
        if isinstance(value, str):
            return value.strip() or None

        if not isinstance(value, dict):
            return None

        address = value.get("address")

        if isinstance(address, str):
            return address.strip() or None

        if isinstance(address, dict):
            parts = [
                address.get("streetAddress"),
                address.get("addressLocality"),
                address.get("addressRegion"),
                address.get("postalCode"),
                address.get("addressCountry"),
            ]
            cleaned = [str(part).strip() for part in parts if part]

            if cleaned:
                return ", ".join(cleaned)

        name = value.get("name")
        return str(name).strip() if name else None

    def _meta_description(self, response):
        values = [
            response.css('meta[name="description"]::attr(content)').get(),
            response.css('meta[property="og:description"]::attr(content)').get(),
            response.css('meta[name="twitter:description"]::attr(content)').get(),
        ]

        for value in values:
            cleaned = self._clean_text(value)
            if cleaned:
                return cleaned[:4000]

        return None

    def _first_meaningful_paragraph(self, selector):
        for paragraph in selector.css("p"):
            text = self._clean_text(self._selector_text(paragraph))
            if text and len(text) >= 40:
                return text[:4000]
        return None

    def _first_text(self, selector, css_selectors):
        for css_selector in css_selectors:
            node = selector.css(css_selector)
            if not node:
                continue

            text = self._clean_text(self._selector_text(node[0]))
            if text:
                return text

        return None

    def _page_text(self, response):
        chunks = self._visible_text_chunks(response)
        return " ".join(chunks)

    @staticmethod
    def _visible_text_chunks(selector):
        values = selector.xpath(
            ".//text()[normalize-space() and not(ancestor::script) and not(ancestor::style) and not(ancestor::noscript)]"
        ).getall()

        chunks = []
        for value in values:
            cleaned = " ".join(str(value).split())
            if cleaned:
                chunks.append(cleaned)

        return chunks

    @staticmethod
    def _selector_text(selector):
        values = selector.xpath(".//text()[normalize-space()]").getall()
        return " ".join(" ".join(str(value).split()) for value in values if value)

    @staticmethod
    def _clean_text(value):
        if value is None:
            return None

        cleaned = " ".join(str(value).split()).strip()
        return cleaned or None
