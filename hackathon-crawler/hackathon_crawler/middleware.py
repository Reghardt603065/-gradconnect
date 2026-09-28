from scrapy import signals


class HackathonCrawlerSpiderMiddleware:
    @classmethod
    def from_crawler(cls, crawler):
        middleware = cls()
        crawler.signals.connect(
            middleware.spider_opened,
            signal=signals.spider_opened,
        )
        return middleware

    def process_spider_input(self, response):
        return None

    async def process_spider_output(self, response, result):
        async for item in result:
            yield item

    def process_spider_exception(self, response, exception):
        return None

    async def process_start(self, start):
        async for item_or_request in start:
            yield item_or_request

    def spider_opened(self, spider):
        spider.logger.info("Spider opened: %s", spider.name)


class HackathonCrawlerDownloaderMiddleware:
    @classmethod
    def from_crawler(cls, crawler):
        middleware = cls()
        crawler.signals.connect(
            middleware.spider_opened,
            signal=signals.spider_opened,
        )
        return middleware

    def process_request(self, request):
        return None

    def process_response(self, request, response):
        return response

    def process_exception(self, request, exception):
        return None

    def spider_opened(self, spider):
        spider.logger.info("Spider opened: %s", spider.name)
