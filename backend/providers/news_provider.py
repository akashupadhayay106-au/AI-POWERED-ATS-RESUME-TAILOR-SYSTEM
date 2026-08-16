import httpx
import asyncio
import random
from typing import List, Dict, Any, Optional
from config import settings

class NewsProvider:
    def __init__(self):
        self.api_key = settings.NEWS_API_KEY
        self.base_url = "https://newsapi.org/v2/everything"
        self.top_headlines_url = "https://newsapi.org/v2/top-headlines"
        self.timeout = settings.REQUEST_TIMEOUT

    async def get_top_headlines(self, category: str = "technology", country: str = "us", page_size: int = 10) -> List[Dict[str, Any]]:
        """Fetch top headlines for the dashboard ticker/slides."""
        params = {
            "category": category,
            "country": country,
            "pageSize": page_size,
            "apiKey": self.api_key
        }
        return await self._safe_request(self.top_headlines_url, params)

    async def search_everything(self, query: str, page_size: int = 20) -> List[Dict[str, Any]]:
        """Broader search for role-specific insights."""
        params = {
            "q": query,
            "sortBy": "publishedAt",
            "pageSize": page_size,
            "language": "en",
            "apiKey": self.api_key
        }
        return await self._safe_request(self.base_url, params)

    async def _safe_request(self, url: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            for attempt in range(settings.MAX_RETRIES):
                try:
                    response = await client.get(url, params=params, timeout=self.timeout)
                    if response.status_code == 200:
                        data = response.json()
                        articles = data.get("articles", [])
                        return self._deduplicate_articles(articles)
                    elif response.status_code == 429:
                        # Rate limited
                        print("NewsAPI: Rate limit hit. Falling back to mock data.")
                        return self._get_mock_news()
                    else:
                        print(f"NewsAPI Error: {response.status_code} - {response.text}")
                        if attempt == settings.MAX_RETRIES - 1:
                            return self._get_mock_news()
                except (httpx.TimeoutException, httpx.RequestError) as e:
                    print(f"NewsAPI Connection Error (Attempt {attempt+1}): {e}")
                    if attempt == settings.MAX_RETRIES - 1:
                        return self._get_mock_news()
                    await asyncio.sleep(1 * (attempt + 1))
        return self._get_mock_news()

    def _deduplicate_articles(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen = set()
        unique = []
        for art in articles:
            # Composite key for deduplication
            title = art.get("title", "").strip().lower()
            url = art.get("url", "").strip().lower()
            if not title or title == "[removed]" or url in seen or title in seen:
                continue
            seen.add(url)
            seen.add(title)
            unique.append(art)
        return unique

    def _get_mock_news(self) -> List[Dict[str, Any]]:
        """Fallback mock data when API is unavailable."""
        mocks = [
            {
                "title": "Future of AI in Tech Recruitment 2026",
                "source": {"name": "Industry Trends"},
                "publishedAt": "2026-05-14T10:00:00Z",
                "description": "How AI is shaping the way companies hire top talent in the coming years.",
                "url": "#",
                "urlToImage": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop"
            },
            {
                "title": "Mastering Remote Interviews",
                "source": {"name": "Career Insights"},
                "publishedAt": "2026-05-13T14:30:00Z",
                "description": "Essential tips for standing out in a virtual interview environment.",
                "url": "#",
                "urlToImage": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop"
            },
            {
                "title": "The Evolution of ATS Systems",
                "source": {"name": "Tech Careers"},
                "publishedAt": "2026-05-12T09:15:00Z",
                "description": "What job seekers need to know about the latest algorithm updates in ATS.",
                "url": "#",
                "urlToImage": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop"
            }
        ]
        random.shuffle(mocks)
        return mocks

news_provider = NewsProvider()
