from providers.news_provider import news_provider
from typing import List, Dict, Any
import datetime

class NewsService:
    def __init__(self):
        self.provider = news_provider
        self._cache = {} # Simple in-memory cache: {query: (timestamp, data)}
        self.cache_duration = 3600 # 1 hour

    async def get_personalized_news(self, role: str = "technology", domain: str = "hiring") -> List[Dict[str, Any]]:
        query = f"{role} {domain} career tips"
        now = datetime.datetime.now().timestamp()

        if query in self._cache:
            ts, data = self._cache[query]
            if now - ts < self.cache_duration:
                return data

        articles = await self.provider.fetch_career_news(query)
        processed = self._process_articles(articles)
        self._cache[query] = (now, processed)
        return processed

    async def get_top_career_news(self) -> List[Dict[str, Any]]:
        query = "career_top"
        now = datetime.datetime.now().timestamp()
        
        if query in self._cache:
            ts, data = self._cache[query]
            if now - ts < self.cache_duration:
                return data

        articles = await self.provider.fetch_top_tech_news()
        processed = self._process_articles(articles)
        self._cache[query] = (now, processed)
        return processed

    def _process_articles(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for art in articles:
            results.append({
                "title": art.get("title"),
                "source": art.get("source", {}).get("name"),
                "published_at": art.get("publishedAt"),
                "description": art.get("description"),
                "url": art.get("url"),
                "urlToImage": art.get("urlToImage")
            })
        return results

news_service = NewsService()
