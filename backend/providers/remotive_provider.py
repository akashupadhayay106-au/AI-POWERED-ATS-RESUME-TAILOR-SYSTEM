import httpx
from typing import List, Dict, Any, Optional

class RemotiveProvider:
    def __init__(self):
        self.base_url = "https://remotive.com/api/remote-jobs"

    async def fetch_remote_jobs(self, category: str = "software-dev", limit: int = 10) -> List[Dict[str, Any]]:
        params = {
            "category": category,
            "limit": limit
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.base_url, params=params, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("jobs", [])
                return []
            except Exception as e:
                print(f"Remotive API Error: {e}")
                return []

remotive_provider = RemotiveProvider()
