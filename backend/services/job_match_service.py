from typing import List, Dict, Any
from services.analysis_service import analysis_service
from schemas.job import JobRecommendation, JobMatchInfo, ResumeProfile
import re

class JobMatchService:
    def __init__(self):
        self.analysis_service = analysis_service

    def calculate_match(self, resume_text: str, resume_profile: ResumeProfile, job: Dict[str, Any]) -> JobRecommendation:
        job_title = job.get("title", "")
        job_description = job.get("description", "")
        company = job.get("company", {}).get("display_name", "Unknown")
        location = job.get("location", {}).get("display_name", "Unknown")
        source = "Adzuna"
        posted_date = job.get("created", "")
        apply_link = job.get("redirect_url", "")
        job_id = job.get("id", "")

        # Clean job description for analysis
        cleaned_jd = self._clean_html(job_description)
        
        # Use existing analysis service logic
        analysis = self.analysis_service.analyze(resume_text, cleaned_jd)
        
        match_info = JobMatchInfo(
            match_percentage=analysis["overall"],
            matched_skills=analysis["matchedKeywords"],
            missing_skills=analysis["missingKeywords"][:5], # Show top 5 missing
            why_it_matches=analysis["explanation"]
        )

        return JobRecommendation(
            id=str(job_id),
            title=job_title,
            company=company,
            location=location,
            source=source,
            posted_date=posted_date,
            description=cleaned_jd[:300] + "...",
            apply_link=apply_link,
            match_info=match_info
        )

    def _clean_html(self, html: str) -> str:
        # Simple regex based HTML cleaner
        clean = re.compile('<.*?>')
        return re.sub(clean, '', html)

job_match_service = JobMatchService()
