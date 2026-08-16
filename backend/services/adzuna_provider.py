import httpx
import asyncio
from typing import List, Dict, Any, Optional
import sys
import os

# Adjust path to import config settings
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

class AdzunaProvider:
    def __init__(self):
        self.app_id = settings.ADZUNA_APP_ID
        self.app_key = settings.ADZUNA_APP_KEY
        self.base_url = "https://api.adzuna.com/v1/api/jobs"
        self.timeout = settings.REQUEST_TIMEOUT

    async def search_jobs(
        self,
        query: str,
        location: str = "in",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search jobs using Adzuna API.
        Returns a list of normalized job dictionaries.
        """
        country = location.lower().strip() if location else "in"
        # Adzuna API format: /search/{page}
        url = f"{self.base_url}/{country}/search/1"

        params = {
            "app_id": self.app_id,
            "app_key": self.app_key,
            "results_per_page": limit,
            "what": query,
            "content-type": "application/json"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=self.timeout)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    return results
                else:
                    print(f"Adzuna API returned status {response.status_code}: {response.text}")
                    return self._get_mock_jobs(query, location)
        except Exception as e:
            print(f"Error querying Adzuna API: {e}")
            return self._get_mock_jobs(query, location)

    def _get_mock_jobs(self, query: str, location: str) -> List[Dict[str, Any]]:
        """Fallback mock data when API is unavailable."""
        return [
            {
                "id": "mock-adzuna-1",
                "title": f"Senior {query} Developer",
                "company": {"display_name": "TechCorp Solutions"},
                "location": {"display_name": f"Remote, {location.upper()}"},
                "description": f"Exciting opportunity for a skilled {query} professional. Build state-of-the-art scalable systems, optimize workflows, and collaborate with cross-functional teams.",
                "redirect_url": "https://example.com/apply/1",
                "created": "2026-07-09T09:00:00Z"
            },
            {
                "id": "mock-adzuna-2",
                "title": f"Lead {query} Architect",
                "company": {"display_name": "Innovate Ltd"},
                "location": {"display_name": f"Mumbai, {location.upper()}"},
                "description": f"Looking for an experienced {query} specialist to lead our new engineering initiatives. Experience with cloud services and agile methodologies required.",
                "redirect_url": "https://example.com/apply/2",
                "created": "2026-07-08T15:30:00Z"
            }
        ]

adzuna_provider = AdzunaProvider()
