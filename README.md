# ResumeIQ — AI Resume Tailor Platform

ResumeIQ is a premium, single-page web application that helps job seekers bypass ATS (Applicant Tracking System) filters. It allows users to upload their resume, input a target job description, and receive an instant ATS compatibility score with visual breakdowns. The platform then provides AI-generated career coaching and a fully rewritten, tailored version of their resume using the STAR method, significantly increasing their chances of landing an interview.

## Tech Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3, Vite, Three.js (for 3D visual effects), Chart.js
- **Backend**: Python, FastAPI
- **AI Integration**: Google Gemini API

## Prerequisites
- Python 3.9 or higher
- Node.js 18 or higher

## Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/akashupadhayay106-au/ResumeIQ.git
   cd ResumeIQ
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv .venv
   
   # Activate virtual environment
   # Windows:
   .\.venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Set Environment Variables:**
   Create a `.env` file in the root directory (or in the `backend/` directory) containing:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ADZUNA_APP_ID=your_adzuna_app_id
   ADZUNA_APP_KEY=your_adzuna_app_key
   NEWS_API_KEY=your_news_api_key_here
   BACKEND_PORT=8088
   ```

4. **Frontend Setup:**
   ```bash
   # From the project root (not backend folder)
   npm install
   ```

5. **Run the Application:**
   Start the backend:
   ```bash
   # From the backend directory
   python run_backend.py
   ```
   
   Start the frontend:
   ```bash
   # From the project root
   npm run dev
   ```

## How to get a free Gemini API key
1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click "Create API key".
4. Copy the generated key and paste it into your `.env` file as `GEMINI_API_KEY`.

## Folder Structure
```
ResumeIQ/
├── backend/            # FastAPI python backend
│   ├── app.py          # Main FastAPI application entry point
│   ├── analysis.py     # AI interaction layer calling Gemini
│   ├── config.py       # Pydantic configuration loader
│   ├── requirements.txt
│   └── ...
├── src/                # Frontend JavaScript source files
│   ├── main.js         # Core frontend logic and DOM wiring
│   ├── tailorAnimation.js # 3D Cinematic Tailoring animation sequence
│   ├── threeScene.js   # Three.js 3D Orb Logic
│   └── ...
├── index.html          # Main HTML entry point
├── package.json        # Frontend Node.js dependencies
└── ...
```

## Known Limitations
- The "frozen 0% progress bar" bug exists when users request AI tailoring in certain paths (the UI fails to update when the thread is awaiting the backend promise due to a missing/sync function).
- "Save to PDF" might not correctly reflect the generated format in some browser environments.
- The UI chat is not persisted to a database (it is session-only for now).
- Does not automatically scrape LinkedIn profiles; requires manual resume text upload.
