"""
scraper/scrapers/
-----------------
Each file in this package is a self-contained scraper for one hospital system
or career site. All must extend BaseScraper and implement scrape().

Available scrapers (add as you build them):
    - GenericHospitalScraper  — HTML + JSON-LD fallback for single-hospital pages
    - (future) IndeedHospitalScraper
    - (future) WorkdayScraper
    - (future) TaleoScraper
"""
