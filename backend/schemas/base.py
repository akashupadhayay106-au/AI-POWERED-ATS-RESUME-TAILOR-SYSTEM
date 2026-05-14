from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime

class AnalyzeRequest(BaseModel):
    resume_text: str
    jd_text: str
    filename: Optional[str] = "resume.pdf"
    mode: Optional[str] = "single" # single, recruiter, institute

class LinkedInRequest(BaseModel):
    resume_text: str

class ProjectEnhanceRequest(BaseModel):
    project_text: str

class TailorRequest(BaseModel):
    resume_text: str
    jd_text: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    resume_text: str
    jd_text: str
    history: Optional[List[ChatMessage]] = None

class SuggestionsRequest(BaseModel):
    resume_text: str
    jd_text: str
    score: float

class FetchJdRequest(BaseModel):
    url: str

class AnalysisResponse(BaseModel):
    id: Optional[int]
    overall: float
    interpret: str
    breakdown: Dict[str, float]
    matchedKeywords: List[str]
    missingKeywords: List[str]
    jd: Dict[str, Any]
    fit_prediction: str
    explanation: str
    weak_bullets: Optional[List[Dict[str, Any]]] = None
    jd_intelligence: Optional[Dict[str, List[str]]] = None

class HistoryResponse(BaseModel):
    id: int
    filename: str
    overall_score: float
    created_at: datetime

    class Config:
        from_attributes = True
