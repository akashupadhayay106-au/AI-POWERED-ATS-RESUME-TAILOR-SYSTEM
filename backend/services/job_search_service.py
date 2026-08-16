import httpx
from config import settings
from typing import List, Dict, Any
from schemas.job import JobRecommendation

class JobSearchService:
    def __init__(self):
        self.app_id = settings.ADZUNA_APP_ID
        self.app_key = settings.ADZUNA_APP_KEY
        self.base_url = "https://api.adzuna.com/v1/api/jobs"

    async def search_jobs(self, query: str, location: str = "us", results_per_page: int = 10) -> List[Dict[str, Any]]:
        if not self.app_id or not self.app_key:
            return self._get_mock_jobs(query, location)

        url = f"{self.base_url}/{location}/search/1"
        params = {
            "app_id": self.app_id,
            "app_key": self.app_key,
            "results_per_page": results_per_page,
            "what": query,
            "content-type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("results", [])
                else:
                    print(f"Adzuna API error: {response.status_code} - {response.text}")
                    return self._get_mock_jobs(query, location)
            except Exception as e:
                print(f"Error searching jobs: {e}")
                return self._get_mock_jobs(query, location)

    def _get_mock_jobs(self, query: str, location: str) -> List[Dict[str, Any]]:
        return [
            {
                "id": "mock-1",
                "title": f"Senior {query.capitalize()} Engineer",
                "company": {"display_name": "TechInnovate Solutions"},
                "location": {"display_name": f"Remote, {location.upper()}"},
                "description": f"Exciting opportunity for a {query} expert to join our growing team. You will work on cutting-edge AI-powered systems...",
                "redirect_url": "#",
                "created": "2026-05-14T08:00:00Z"
            },
            {
                "id": "mock-2",
                "title": f"Lead {query.capitalize()} Specialist",
                "company": {"display_name": "DataFlow Dynamics"},
                "location": {"display_name": f"New York, {location.upper()}"},
                "description": f"Seeking a talented {query} lead to drive technical excellence in our software delivery pipeline...",
                "redirect_url": "#",
                "created": "2026-05-13T11:30:00Z"
            }
        ]

job_search_service = JobSearchService()
