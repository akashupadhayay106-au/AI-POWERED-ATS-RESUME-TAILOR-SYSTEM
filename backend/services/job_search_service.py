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
            print("Adzuna API credentials not configured. Returning empty list.")
            return []

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
            except Exception as e:
                print(f"Error searching jobs: {e}")
        
        return []

job_search_service = JobSearchService()
