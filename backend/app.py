from fastapi import FastAPI, HTTPException, Depends, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Any

import models, database, config, os
from sqlalchemy import text
from schemas.base import (
    AnalyzeRequest, AnalysisResponse, HistoryResponse, 
    FetchJdRequest, TailorRequest, ChatRequest, SuggestionsRequest,
    LinkedInRequest, ProjectEnhanceRequest
)
from schemas.job import JobSearchRequest, JobRecommendation, TailorForJobRequest
from schemas.resume import ResumeData
from services.latex_service import generate_latex_resume
from fastapi.responses import PlainTextResponse, JSONResponse
from services.analysis_service import analysis_service
from services.ai_service import ai_service
from services.fetch_service import fetch_service
from services.resume_profile_service import resume_profile_service
from services.job_search_service import job_search_service
from services.job_match_service import job_match_service
from routes import news


def sanitize_latex(text: Any) -> str:
    """Sanitize text to be safe for LaTeX, escape special characters and handle Unicode."""
    if text is None:
        return ""
    text = str(text)
    replacements = [
        ("\\", r"\textbackslash{}"),
        ("&", r"\&"),
        ("%", r"\%"),
        ("$", r"\$"),
        ("#", r"\#"),
        ("_", r"\_"),
        ("{", r"\{"),
        ("}", r"\}"),
        ("~", r"\textasciitilde{}"),
        ("^", r"\textasciicircum{}"),
        ("\u2014", "---"),
        ("\u2013", "--"),
        ("\u2019", "'"),
        ("\u201c", "``"),
        ("\u201d", "''"),
    ]
    for char, replacement in replacements:
        text = text.replace(char, replacement)
    return text

# Initialize Database
models.Base.metadata.create_all(bind=database.engine)

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="ResumeIQ Pro API")
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
    from config import settings
    db_status = "connected"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "disconnected"

    gemini_configured = bool(settings.GEMINI_API_KEY and "your_" not in settings.GEMINI_API_KEY)
    adzuna_configured = bool(settings.ADZUNA_APP_ID and "your_" not in settings.ADZUNA_APP_ID
                             and settings.ADZUNA_APP_KEY and "your_" not in settings.ADZUNA_APP_KEY)

    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow(),
        "version": "1.2.0",
        "database": db_status,
        "environment": "production" if os.getenv("RENDER") else "development",
        "services": {
            "gemini_ai": "configured" if gemini_configured else "not_configured",
            "adzuna_jobs": "configured" if adzuna_configured else "not_configured",
            "news_api": "configured" if settings.NEWS_API_KEY else "not_configured (optional)"
        }
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
    data = await ai_service.tailor_resume(request_data.resume_text, request_data.jd_text)
    return data

@app.post("/api/ai/chat")
@limiter.limit("10/minute")
async def ai_chat(request: Request, request_data: ChatRequest):
    history = [h.dict() for h in request_data.history] if request_data.history else []
    reply = await ai_service.chat(request_data.message, request_data.resume_text, request_data.jd_text, history, request_data.score)
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
    data = await ai_service.tailor_resume(request_data.resume_text, request_data.job_description)
    return data


class ScoreJdRequest(BaseModel):
    resume_text: str
    jd_text: str

@app.post("/api/score")
async def score_api_mock(request: Request, request_data: ScoreJdRequest):
    return {
        "score": 75,
        "missing": ["AWS", "Docker"],
        "suggestions": ["Add AWS experience"]
    }


@app.post("/api/score-jd")
@limiter.limit("20/minute")
async def score_jd(request: Request, request_data: ScoreJdRequest):
    """
    Deep-learning semantic cosine similarity score between resume and JD.
    Falls back to local TF-IDF cosine if Gemini/FAISS is unavailable.
    Returns score, breakdown dials, matched_keywords, and missing_keywords.
    """
    r_text = request_data.resume_text.strip()
    j_text = request_data.jd_text.strip()

    if not r_text or not j_text:
        return {
            "success": True, "score": 0, "cosine_raw": 0.0,
            "breakdown": {"ats": 0, "keywords": 0, "readability": 0, "impact": 0},
            "matched_keywords": [], "missing_keywords": []
        }

    # ── 1. Extract keywords (always available) ──────────────────────────────
    jd_keywords = analysis_service.extract_keywords(j_text, top_n=30)
    from utils.text_processing import tokenize
    resume_tokens = set(tokenize(r_text))
    matched_keywords = [kw for kw in jd_keywords if kw in resume_tokens]
    missing_keywords = [kw for kw in jd_keywords if kw not in resume_tokens]
    kw_ratio = len(matched_keywords) / max(len(jd_keywords), 1)
    kw_score = int(min(99, kw_ratio * 100))

    sim = None
    scaled_score = None

    # ── 2. Gemini embedding cosine similarity (preferred) ──────────────────
    try:
        from services.rag_service import rag_service
        import numpy as np
        v_resume = rag_service._get_embedding(r_text)
        v_jd = rag_service._get_embedding(j_text)
        dot = np.dot(v_resume, v_jd)
        norm_r = np.linalg.norm(v_resume)
        norm_j = np.linalg.norm(v_jd)
        sim = float(dot / (norm_r * norm_j)) if (norm_r > 0 and norm_j > 0) else 0.0
        raw_scaled = (sim - 0.20) / 0.60
        scaled_score = int(max(5, min(99, raw_scaled * 100)))
    except Exception as emb_err:
        print(f"[score-jd] Embedding fallback triggered: {emb_err}")

    # ── 3. Fallback: local TF-IDF cosine (if embedding failed) ─────────────
    if scaled_score is None:
        local_sim = analysis_service.calculate_cosine_similarity(r_text, j_text)
        sim = local_sim
        # Local cosine is already 0-1 but noisier — weight it directly
        scaled_score = int(max(5, min(99, local_sim * 100)))

    # ── 4. Blend (70% semantic + 30% keyword) ──────────────────────────────
    blended = int(0.70 * scaled_score + 0.30 * kw_score)
    blended = max(5, min(99, blended))

    return {
        "success": True,
        "score": blended,
        "cosine_raw": round(sim, 4) if sim is not None else 0.0,
        "breakdown": {
            "ats": blended,
            "keywords": kw_score,
            "readability": int(max(5, min(99, blended - 8))),
            "impact": int(max(5, min(99, blended + 10)))
        },
        "matched_keywords": matched_keywords[:20],
        "missing_keywords": missing_keywords[:20]
    }


class DirectJobSearchRequest(BaseModel):
    query: str
    location: str = "in"
    limit: int = 10


@app.post("/api/search-jobs")
@limiter.limit("10/minute")
async def search_jobs_direct(request: Request, body: DirectJobSearchRequest):
    """
    Direct keyword-based job search — no resume required.
    Accepts: { query, location (2-letter country code), limit }
    Returns: { success, jobs: [ {id, title, company, location, description, apply_link, salary, posted_date} ] }
    """
    try:
        query = body.query.strip() or "Data Analyst"
        location = body.location.strip().lower() or "in"
        limit = max(1, min(body.limit, 20))  # clamp 1-20

        raw_jobs = await job_search_service.search_jobs(query, location=location, results_per_page=limit)

        # Normalize Adzuna raw format to a clean, frontend-friendly format
        jobs = []
        for j in raw_jobs:
            company = j.get("company", {})
            company_name = company.get("display_name", "Unknown") if isinstance(company, dict) else str(company)
            loc = j.get("location", {})
            loc_name = loc.get("display_name", "Remote") if isinstance(loc, dict) else str(loc)
            salary_min = j.get("salary_min")
            salary_max = j.get("salary_max")
            salary = None
            if salary_min and salary_max:
                salary = f"₹{int(salary_min):,} – ₹{int(salary_max):,}/yr" if location == "in" else f"${int(salary_min):,} – ${int(salary_max):,}/yr"
            elif salary_min:
                salary = f"From ₹{int(salary_min):,}/yr" if location == "in" else f"From ${int(salary_min):,}/yr"

            jobs.append({
                "id": str(j.get("id", "")),
                "title": j.get("title", "Position"),
                "company": company_name,
                "location": loc_name,
                "description": (j.get("description", "") or "")[:1500].strip(),
                "apply_link": j.get("redirect_url") or j.get("apply_link") or "#",
                "salary": salary,
                "posted_date": j.get("created", "")[:10] if j.get("created") else None,
                "source": "adzuna"
            })

        return JSONResponse(content={
            "success": True,
            "query": query,
            "location": location,
            "total": len(jobs),
            "jobs": jobs
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e), "jobs": []}
        )


@app.post("/api/generate-latex-resume", response_class=JSONResponse)
async def generate_latex_resume_endpoint(resume_data: ResumeData):
    """
    Generate LaTeX resume from structured data

    Expects POST request with JSON body containing:
    - full_name, email, phone, location, linkedin, github, portfolio
    - summary
    - skills_programming, skills_data_analysis, skills_tools
    - education (list), experience (list), projects (list)
    - achievements (optional list), certifications (optional list)

    Returns:
    - success: bool
    - latex_code: str (complete LaTeX document)
    - filename: str (suggested filename)
    """
    try:
        # Format education items
        education_items = ""
        for edu in resume_data.education:
            gpa_text = f" | CGPA: {sanitize_latex(edu.gpa)}" if edu.gpa else ""
            # Build the LaTeX for this education entry manually to avoid formatting issues
            education_items += (
                "\n    \\item\n"
                f"    \\textbf{{{sanitize_latex(edu.degree)} --- {sanitize_latex(edu.institution)}}}"
                f" \\hfill {sanitize_latex(edu.location)} \\\\\n"
                f"    \\textit{{{sanitize_latex(edu.dates)}{gpa_text}}}\n"
            )

        # Format experience items
        experience_items = ""
        for exp in resume_data.experience:
            bullet_lines = "\n".join([f"        \\item {sanitize_latex(bullet)}" for bullet in exp.bullets])
            experience_items += (
                "\n    \\item\n"
                f"    \\textbf{{{sanitize_latex(exp.title)} --- {sanitize_latex(exp.company)}}}"
                f" \\hfill {sanitize_latex(exp.location)} \\\\\n"
                f"    \\textit{{{sanitize_latex(exp.dates)}}}\n"
                "    \\begin{itemize}\n"
                f"{bullet_lines}\n"
                "    \\end{itemize}\n"
            )

        # Format projects items
        projects_items = ""
        for proj in resume_data.projects:
            desc_lines = "\n".join([f"        \\item {sanitize_latex(desc)}" for desc in proj.description])
            projects_items += (
                "\n    \\item\n"
                f"    \\textbf{{{sanitize_latex(proj.name)}}}\n"
                "    \\begin{itemize}\n"
                f"{desc_lines}\n"
                "    \\end{itemize}\n"
            )

        # Format achievements (if present)
        achievements_items = ""
        if resume_data.achievements:
            achievements_items = "\n".join(
                [f"    \\item {sanitize_latex(a)}" for a in resume_data.achievements]
            )

        # Format certifications (if present)
        certifications_items = ""
        if resume_data.certifications:
            certifications_items = "\n".join(
                [f"    \\item {sanitize_latex(c)}" for c in resume_data.certifications]
            )

        # Build contact line
        contact_parts = [
            sanitize_latex(resume_data.location),
            sanitize_latex(resume_data.phone),
            r"\href{mailto:" + sanitize_latex(resume_data.email) + r"}{\underline{" + sanitize_latex(resume_data.email) + r"}}",
        ]
        if resume_data.linkedin:
            contact_parts.append(r"\href{" + sanitize_latex(resume_data.linkedin) + r"}{\underline{LinkedIn}}")
        if resume_data.github:
            contact_parts.append(r"\href{" + sanitize_latex(resume_data.github) + r"}{\underline{GitHub}}")
        if resume_data.portfolio:
            contact_parts.append(r"\href{" + sanitize_latex(resume_data.portfolio) + r"}{\underline{Portfolio}}")
        contact_line = " $|$ ".join(contact_parts)

        # Build data dictionary for template
        latex_data = {
            "full_name": sanitize_latex(resume_data.full_name),
            "contact_line": contact_line,
            "summary": sanitize_latex(resume_data.summary),
            "skills_programming": sanitize_latex(resume_data.skills_programming),
            "skills_data_analysis": sanitize_latex(resume_data.skills_data_analysis),
            "skills_tools": sanitize_latex(resume_data.skills_tools),
            "education_items": education_items,
            "experience_items": experience_items,
            "projects_items": projects_items,
            "achievements_items": achievements_items,
            "certifications_items": certifications_items,
            "show_achievements": bool(resume_data.achievements),
            "show_certifications": bool(resume_data.certifications),
            "style_preset": resume_data.style_preset
        }

        # Generate LaTeX
        latex_code = generate_latex_resume(latex_data)

        # Generate filename
        filename = f"{resume_data.full_name.replace(' ', '_').replace('.', '')}_resume.tex"

        return JSONResponse(content={
            "success": True,
            "latex_code": latex_code,
            "filename": filename,
            "message": "LaTeX resume generated successfully"
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "message": "Failed to generate LaTeX resume"
            }
        )


@app.get("/api/download-latex-file/{filename}")
async def download_latex_file(filename: str):
    """
    Download LaTeX file directly as plain text
    (Optional endpoint for direct file download)
    """
    return PlainTextResponse(
        content="",  # You would fetch from database or generate here
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

