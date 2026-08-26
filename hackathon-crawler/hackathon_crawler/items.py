import scrapy

# structured container that gets filled for each hackathon found on a page
class HackathonItem(scrapy.Item):
    name = scrapy.Field()
    description = scrapy.Field()
    start_date = scrapy.Field()
    end_date = scrapy.Field()
    source_url = scrapy.Field()
