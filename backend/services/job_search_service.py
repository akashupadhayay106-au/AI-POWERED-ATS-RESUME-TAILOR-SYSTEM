from providers.adzuna_provider import adzuna_provider
from typing import List, Dict, Any, Optional
import random

class JobSearchService:
    def __init__(self):
        self.provider = adzuna_provider
        self._shown_job_ids = set() # Simple session-based tracking (ideally this would be per-user in DB)

    async def search_jobs(
        self, 
        query: str, 
        location: str = "us", 
        results_per_page: int = 20
    ) -> List[Dict[str, Any]]:
        """Search jobs and filter out already shown results if possible."""
        
        # Determine remote preference from query
        is_remote = "remote" in query.lower()
        
        raw_jobs = await self.provider.search_jobs(
            role=query,
            location=location,
            remote=is_remote,
            results_per_page=results_per_page
        )
        
        # Filter out jobs that have been shown many times in this session
        # (Allowing some repeats but prioritizing new ones)
        new_jobs = []
        repeat_jobs = []
        
        for job in raw_jobs:
            job_id = str(job.get("id"))
            if job_id in self._shown_job_ids:
                repeat_jobs.append(job)
            else:
                new_jobs.append(job)
                self._shown_job_ids.add(job_id)
        
        # Maintain a reasonable size for the 'shown' set to avoid memory bloat
        if len(self._shown_job_ids) > 1000:
            self._shown_job_ids.clear()

        # Combine results: New jobs first, then some repeats for variety if needed
        final_jobs = new_jobs + repeat_jobs[:5]
        random.shuffle(final_jobs)
        
        return final_jobs

job_search_service = JobSearchService()
