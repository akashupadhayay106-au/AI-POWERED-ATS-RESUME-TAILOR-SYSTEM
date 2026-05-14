import httpx
import asyncio
from typing import List, Dict, Any, Optional
from config import settings

class NewsProvider:
    def __init__(self):
        self.api_key = settings.NEWS_API_KEY
        self.base_url = "https://newsapi.org/v2/everything"
        self.top_headlines_url = "https://newsapi.org/v2/top-headlines"

    async def fetch_career_news(self, query: str = "career tech hiring", page_size: int = 10) -> List[Dict[str, Any]]:
        if not self.api_key:
            return self._get_mock_news()

        params = {
            "q": query,
            "sortBy": "publishedAt",
            "pageSize": page_size,
            "language": "en",
            "apiKey": self.api_key
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.base_url, params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("articles", [])
                else:
                    print(f"NewsAPI Error: {response.status_code} - {response.text}")
                    return self._get_mock_news()
            except Exception as e:
                print(f"Error fetching news: {e}")
                return self._get_mock_news()

    def _get_mock_news(self) -> List[Dict[str, Any]]:
        return [
            {
                "title": "Top 10 Resume Tips for 2026",
                "source": {"name": "Career Insights"},
                "publishedAt": "2026-05-14T10:00:00Z",
                "description": "Learn how to optimize your resume for the latest ATS systems using AI-driven techniques.",
                "url": "#",
                "urlToImage": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop"
            },
            {
                "title": "Mastering the Technical Interview",
                "source": {"name": "Tech Jobs"},
                "publishedAt": "2026-05-13T14:30:00Z",
                "description": "A comprehensive guide to acing technical interviews in the age of AI and remote work.",
                "url": "#",
                "urlToImage": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop"
            },
            {
                "title": "The Rise of AI in Recruitment",
                "source": {"name": "Industry Trends"},
                "publishedAt": "2026-05-12T09:15:00Z",
                "description": "How recruiters are using AI to find top talent and what you can do to stand out.",
                "url": "#",
                "urlToImage": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop"
            }
        ]

    async def fetch_top_tech_news(self, page_size: int = 5) -> List[Dict[str, Any]]:
        if not self.api_key:
            return self._get_mock_news()[:page_size]

        params = {
            "category": "technology",
            "language": "en",
            "pageSize": page_size,
            "apiKey": self.api_key
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.top_headlines_url, params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("articles", [])
                return self._get_mock_news()[:page_size]
            except Exception as e:
                print(f"Error fetching top headlines: {e}")
                return self._get_mock_news()[:page_size]

news_provider = NewsProvider()
