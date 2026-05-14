from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class JobMatchInfo(BaseModel):
    match_percentage: float
    matched_skills: List[str]
    missing_skills: List[str]
    why_it_matches: str

class JobRecommendation(BaseModel):
    id: str
    title: str
    company: str
    location: str
    source: str
    posted_date: Optional[str] = None
    description: str
    apply_link: str
    match_info: Optional[JobMatchInfo] = None

class JobSearchRequest(BaseModel):
    resume_text: str
    location: Optional[str] = "us"

class TailorForJobRequest(BaseModel):
    resume_text: str
    job_id: str
    job_description: str

class ResumeProfile(BaseModel):
    probable_roles: List[str]
    skills: List[str]
    seniority: str
    domain: str
    tools: List[str]
