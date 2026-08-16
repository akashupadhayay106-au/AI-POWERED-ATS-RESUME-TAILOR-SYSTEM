import httpx
import asyncio
import random
from typing import List, Dict, Any, Optional
from config import settings

class AdzunaProvider:
    def __init__(self):
        self.app_id = settings.ADZUNA_APP_ID
        self.app_key = settings.ADZUNA_APP_KEY
        self.base_url = "https://api.adzuna.com/v1/api/jobs"
        self.timeout = settings.REQUEST_TIMEOUT

    async def search_jobs(
        self, 
        role: str, 
        location: str = "us", 
        region: Optional[str] = None, 
        city: Optional[str] = None,
        remote: bool = False,
        page: int = 1,
        results_per_page: int = 20
    ) -> List[Dict[str, Any]]:
        """Search jobs with regional and remote support."""
        
        # Adzuna URL format: {base_url}/{country}/search/{page}
        # Default country is 'us'
        country = location.lower() if location and len(location) == 2 else "us"
        url = f"{self.base_url}/{country}/search/{page}"
        
        params = {
            "app_id": self.app_id,
            "app_key": self.app_key,
            "results_per_page": results_per_page,
            "what": role,
            "content-type": "application/json"
        }
        
        # Add regional/city info to 'where' parameter
        where = []
        if city: where.append(city)
        if region: where.append(region)
        if where:
            params["where"] = ", ".join(where)
            
        if remote:
            # Adzuna specific remote flag or add to 'what'
            params["what"] = f"{role} remote"

        return await self._safe_request(url, params, role, location)

    async def _safe_request(self, url: str, params: Dict[str, Any], query: str, location: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            for attempt in range(settings.MAX_RETRIES):
                try:
                    response = await client.get(url, params=params, timeout=self.timeout)
                    if response.status_code == 200:
                        data = response.json()
                        results = data.get("results", [])
                        return await self._process_results(results)
                    else:
                        print(f"Adzuna Error: {response.status_code} - {response.text}")
                        if attempt == settings.MAX_RETRIES - 1:
                            return self._get_mock_jobs(query, location)
                except (httpx.TimeoutException, httpx.RequestError) as e:
                    print(f"Adzuna Connection Error (Attempt {attempt+1}): {e}")
                    if attempt == settings.MAX_RETRIES - 1:
                        return self._get_mock_jobs(query, location)
                    await asyncio.sleep(1 * (attempt + 1))
        return self._get_mock_jobs(query, location)

    async def _process_results(self, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate and validate job results."""
        seen_ids = set()
        unique_jobs = []
        
        for job in jobs:
            # Use Adzuna ID if available, otherwise composite key
            job_id = job.get("id") or f"{job.get('title')}|{job.get('company', {}).get('display_name')}"
            
            if job_id in seen_ids:
                continue
            
            seen_ids.add(job_id)
            
            # Basic URL validation fallback
            if not job.get("redirect_url"):
                job["redirect_url"] = "#"
                
            unique_jobs.append(job)
            
        # Shuffle for diversity
        random.shuffle(unique_jobs)
        return unique_jobs

    def _get_mock_jobs(self, query: str, location: str) -> List[Dict[str, Any]]:
        """Fallback mock data when API is unavailable."""
        return [
            {
                "id": "mock-adzuna-1",
                "title": f"Senior {query.capitalize()} Engineer",
                "company": {"display_name": "CloudScale Systems"},
                "location": {"display_name": f"Remote, {location.upper()}"},
                "description": f"Lead our {query} initiatives in a fast-paced environment. Seeking experts in modern tech stacks...",
                "redirect_url": "#",
                "created": "2026-05-14T09:00:00Z"
            },
            {
                "id": "mock-adzuna-2",
                "title": f"{query.capitalize()} Specialist",
                "company": {"display_name": "DataFrontier Corp"},
                "location": {"display_name": f"New York, NY"},
                "description": f"Join our growing team as a {query} specialist. You will be responsible for building scalable solutions...",
                "redirect_url": "#",
                "created": "2026-05-13T15:30:00Z"
            }
        ]

adzuna_provider = AdzunaProvider()
