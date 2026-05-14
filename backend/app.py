from fastapi import FastAPI, HTTPException, Depends, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Any

import models, database, config, os
from sqlalchemy import text
from schemas.base import (
    AnalyzeRequest, AnalysisResponse, HistoryResponse, 
    FetchJdRequest, TailorRequest, ChatRequest, SuggestionsRequest,
    LinkedInRequest, ProjectEnhanceRequest
)
from schemas.job import JobSearchRequest, JobRecommendation, TailorForJobRequest
from services.analysis_service import analysis_service
from services.ai_service import ai_service
from services.fetch_service import fetch_service
from services.resume_profile_service import resume_profile_service
from services.job_search_service import job_search_service
from services.job_match_service import job_match_service
from routes import news

# Initialize Database
models.Base.metadata.create_all(bind=database.engine)

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="ResumeAI Pro API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(news.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.settings.ALLOWED_ORIGINS.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    import datetime
    from database import SessionLocal
    db_status = "connected"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "disconnected"
    
    return {
        "status": "healthy", 
        "timestamp": datetime.datetime.utcnow(), 
        "version": "1.1.0",
        "database": db_status,
        "environment": "production" if os.getenv("RENDER") else "development"
    }

@app.post("/api/analyze-resume", response_model=AnalysisResponse)
async def analyze_resume(request: AnalyzeRequest, db: Session = Depends(database.get_db)):
    try:
        results = analysis_service.analyze(request.resume_text, request.jd_text)
        
        # Save to history
        db_item = models.AnalysisHistory(
            filename=request.filename,
            overall_score=results["overall"],
            section_scores=results["breakdown"],
            matched_keywords=results["matchedKeywords"],
            missing_keywords=results["missingKeywords"],
            fit_prediction=results["fit_prediction"],
            jd_text=request.jd_text,
            resume_text=request.resume_text
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        results["id"] = db_item.id
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history", response_model=List[HistoryResponse])
async def get_history(db: Session = Depends(database.get_db)):
    try:
        return db.query(models.AnalysisHistory).order_by(models.AnalysisHistory.created_at.desc()).limit(20).all()
    except Exception as e:
        print(f"History fetch error: {e}")
        return []

@app.post("/api/fetch-jd")
async def fetch_jd(request: FetchJdRequest):
    try:
        text = await fetch_service.fetch_jd(request.url)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ai/suggestions")
@limiter.limit("5/minute")
async def ai_suggestions(request: Request, request_data: SuggestionsRequest):
    items = await ai_service.get_suggestions(request_data.resume_text, request_data.jd_text, request_data.score)
    return {"suggestions": items}

@app.post("/api/ai/auto-tailor")
@limiter.limit("3/minute")
async def ai_tailor(request: Request, request_data: TailorRequest):
    tailored = await ai_service.tailor_resume(request_data.resume_text, request_data.jd_text)
    return {"tailored": tailored}

@app.post("/api/ai/chat")
@limiter.limit("10/minute")
async def ai_chat(request: Request, request_data: ChatRequest):
    history = [h.dict() for h in request_data.history] if request_data.history else []
    reply = await ai_service.chat(request_data.message, request_data.resume_text, request_data.jd_text, history)
    return {"reply": reply}

@app.post("/api/ai/cover-letter")
@limiter.limit("3/minute")
async def ai_cover_letter(request: Request, request_data: TailorRequest):
    letter = await ai_service.generate_cover_letter(request_data.resume_text, request_data.jd_text)
    return {"cover_letter": letter}

@app.post("/api/ai/interview-questions")
@limiter.limit("3/minute")
async def ai_interview_questions(request: Request, request_data: TailorRequest):
    questions = await ai_service.generate_interview_questions(request_data.resume_text, request_data.jd_text)
    return {"questions": questions}

@app.post("/api/ai/linkedin-optimize")
@limiter.limit("3/minute")
async def ai_linkedin_optimize(request: Request, request_data: LinkedInRequest):
    summary = await ai_service.optimize_linkedin_summary(request_data.resume_text)
    return {"summary": summary}

@app.post("/api/ai/enhance-projects")
@limiter.limit("5/minute")
async def ai_enhance_projects(request: Request, request_data: ProjectEnhanceRequest):
    bullets = await ai_service.enhance_project_bullets(request_data.project_text)
    return {"bullets": bullets}


@app.post("/api/jobs/recommendations", response_model=List[JobRecommendation])
@limiter.limit("5/minute")
async def get_job_recommendations(request: Request, request_data: JobSearchRequest):
    # 1. Extract profile from resume
    profile = await resume_profile_service.extract_profile(request_data.resume_text)
    
    # 2. Search jobs based on probable roles and skills
    query = " ".join(profile.probable_roles[:2])
    raw_jobs = await job_search_service.search_jobs(query, location=request_data.location)
    
    # 3. Match and rank jobs
    recommendations = []
    for job in raw_jobs:
        match = job_match_service.calculate_match(request_data.resume_text, profile, job)
        recommendations.append(match)
        
    # Sort by match percentage
    recommendations.sort(key=lambda x: x.match_info.match_percentage if x.match_info else 0, reverse=True)
    
    return recommendations


@app.post("/api/jobs/tailor")
@limiter.limit("3/minute")
async def tailor_for_job(request: Request, request_data: TailorForJobRequest):
    # This uses existing AI tailoring but specifically for a live job match
    tailored = await ai_service.tailor_resume(request_data.resume_text, request_data.job_description)
    return {"tailored": tailored}

