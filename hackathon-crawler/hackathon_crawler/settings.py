ROBOTSTXT_OBEY = True
DOWNLOAD_DELAY = 2
CONCURRENT_REQUESTS_PER_DOMAIN = 1

BOT_NAME = "hackathon_crawler"
SPIDER_MODULES = ["hackathon_crawler.spiders"]
NEWSPIDER_MODULE = "hackathon_crawler.spiders"

ITEM_PIPELINES = {
    "hackathon_crawler.pipelines.GradConnectApiPipeline": 300,
}

USER_AGENT = "GradConnectHackathonCrawler/1.0"
