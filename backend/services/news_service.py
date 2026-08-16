from providers.news_provider import news_provider
from typing import List, Dict, Any
import datetime
import random

class NewsService:
    def __init__(self):
        self.provider = news_provider
        self._cache = {} # Simple in-memory cache: {query: (timestamp, data)}
        self.cache_duration = 3600 # 1 hour

    async def get_personalized_news(self, role: str = "technology", domain: str = "hiring") -> List[Dict[str, Any]]:
        query = f"{role} {domain} career trends"
        now = datetime.datetime.now().timestamp()

        if query in self._cache:
            ts, data = self._cache[query]
            if now - ts < self.cache_duration:
                return data

        articles = await self.provider.search_everything(query)
        processed = self._process_articles(articles)
        self._cache[query] = (now, processed)
        return processed

    async def get_top_career_news(self) -> List[Dict[str, Any]]:
        query = "top_headlines_tech"
        now = datetime.datetime.now().timestamp()
        
        if query in self._cache:
            ts, data = self._cache[query]
            if now - ts < self.cache_duration:
                return data

        articles = await self.provider.get_top_headlines()
        processed = self._process_articles(articles)
        self._cache[query] = (now, processed)
        return processed

    def _process_articles(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        seen_titles = set()
        
        for art in articles:
            title = art.get("title", "").strip()
            if not title or title.lower() == "[removed]" or title in seen_titles:
                continue
            
            seen_titles.add(title)
            
            results.append({
                "title": title,
                "source": art.get("source", {}).get("name") if isinstance(art.get("source"), dict) else art.get("source"),
                "published_at": art.get("publishedAt"),
                "description": art.get("description"),
                "url": art.get("url"),
                "urlToImage": art.get("urlToImage")
            })
        
        # Staggered shuffling for a "live" dashboard feel
        random.shuffle(results)
        return results

news_service = NewsService()
