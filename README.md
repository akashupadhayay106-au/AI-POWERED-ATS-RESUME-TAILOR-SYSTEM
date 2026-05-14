# ResumeAI — Smart ATS Resume Optimizer (Pro)

An AI-powered career assistant that analyzes resumes against job descriptions, provides ATS scoring, and generates tailored career documents.

## 🏗️ Architecture
- **Frontend**: Vite + Vanilla JS + Chart.js (Modern Dashboard)
- **Backend**: FastAPI + SQLAlchemy + SQLite (Modular Service Layer)
- **AI/ML**: Google Gemini 1.5 Flash + Scikit-learn (TF-IDF, Cosine Similarity)
- **Security**: Backend-only API keys, Rate Limiting (Slowapi), SSRF Protection.

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
uvicorn app:app --reload --port 8000
```

### 2. Frontend Setup
```bash
npm install
npm run dev
```

## 🛠️ Features
- **Live Job Match & Tailor**: Fetch real-time jobs from Adzuna and rank them by relevance to your resume.
- **ATS Analysis**: Layered scoring using NLP and semantic matching.
- **AI Career Suite**: Auto-tailoring, cover letter generation, and STAR/XYZ project enhancement.
- **Analytics Dashboard**: Interactive charts for keyword gaps and readability.
- **History & Tracking**: Save and review past analyses locally.

## 🔒 Security Checklist
- [x] Backend-only API keys (Gemini & Adzuna).
- [x] Rate limiting on AI and Job search endpoints.
- [x] SSRF protection for JD and Job fetching.
- [x] Environment-based configuration.
- [x] Input validation with Pydantic.


## 📈 Roadmap
- [ ] Transformer-based embeddings for semantic matching.
- [ ] Multi-resume benchmarking.
- [ ] Exportable PDF reports.
- [ ] Interview question generator based on resume gaps.
