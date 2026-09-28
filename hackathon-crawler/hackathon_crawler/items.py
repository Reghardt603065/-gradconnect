import scrapy


class HackathonItem(scrapy.Item):
    """Structured staging record produced for every discovered event."""

    name = scrapy.Field()
    description = scrapy.Field()
    start_date = scrapy.Field()
    end_date = scrapy.Field()
    location = scrapy.Field()
    mode = scrapy.Field()
    source_url = scrapy.Field()
    target_url = scrapy.Field()
