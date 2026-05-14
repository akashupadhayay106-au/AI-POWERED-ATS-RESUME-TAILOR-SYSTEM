import google.generativeai as genai
from config import settings
from typing import List, Dict, Any, Optional

class AIService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-3-flash-preview')
        else:
            self.model = None

    async def get_suggestions(self, resume_text: str, jd_text: str, score: float) -> List[Dict[str, Any]]:
        if not self.model: return []
        prompt = f"""
        Analyze the resume against the JD (Score: {score}/100).
        Provide 10 actionable suggestions in JSON format. Do not mention AI or Gemini in the text.
        [{{"title": "...", "detail": "...", "impact": "critical|important|optional", "category": "..."}}]
        
        RESUME: {resume_text[:5000]}
        JD: {jd_text[:5000]}
        """
        try:
            response = self.model.generate_content(prompt)
            import json, re
            match = re.search(r"\[.*\]", response.text, re.DOTALL)
            return json.loads(match.group()) if match else []
        except Exception as e:
            print(f"AI Suggestions Error: {e}")
            return []

    async def tailor_resume(self, resume_text: str, jd_text: str) -> str:
        if not self.model: return "AI career assistant is currently busy. Please try again later."
        prompt = f"""
        Rewrite the resume to align with the JD. Use JD keywords naturally.
        Maintain truthfulness. Output ONLY plain text with headers (CONTACT, SUMMARY, EXPERIENCE, EDUCATION, SKILLS).
        Do not mention your identity or Gemini.
        
        JD: {jd_text[:5000]}
        RESUME: {resume_text[:5000]}
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e: return f"Error: {str(e)}"

    async def chat(self, message: str, resume_text: str, jd_text: str, history: List[Dict[str, str]] = None) -> str:
        if not self.model: return "Chat service is temporarily busy. Please try again."
        context = f"Resume: {resume_text[:3000]}\nJD: {jd_text[:3000]}"
        
        try:
            # Format history for model.start_chat
            formatted_history = []
            if history:
                for h in history:
                    role = "user" if h["role"] == "user" else "model"
                    formatted_history.append({"role": role, "parts": [h["content"]]})
            
            # Start chat with context in system instruction if possible, or just as first message
            chat_session = self.model.start_chat(history=formatted_history)
            
            # Inject context if it's a new chat
            if not formatted_history:
                context_msg = f"You are ResumeAI Assistant, a career coach. Use this context for our conversation:\n\n{context}\n\nIMPORTANT: Do not mention that you are an AI model, specifically do not mention Google or Gemini. Simply provide career advice as an expert coach."
                chat_session.send_message(context_msg)
            
            response = chat_session.send_message(message)
            return response.text.strip()
        except Exception as e:
            return f"Chat Error: {str(e)}"


    async def generate_cover_letter(self, resume_text: str, jd_text: str) -> str:
        if not self.model: return "Cover letter service is currently busy."
        prompt = f"Write a high-converting, professional cover letter based on this resume and JD. Focus on matching skills to requirements.\n\nJD: {jd_text[:3000]}\nRESUME: {resume_text[:3000]}"
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"AI Cover Letter Error: {e}")
            return "Error generating cover letter"

    async def generate_interview_questions(self, resume_text: str, jd_text: str) -> List[str]:
        if not self.model: return []
        prompt = f"Based on this resume and JD, generate 10 targeted interview questions (technical and behavioral) to test the candidate's fit. Output as a simple list. Do not mention AI or Gemini.\n\nJD: {jd_text[:3000]}\nRESUME: {resume_text[:3000]}"
        try:
            response = self.model.generate_content(prompt)
            return [q.strip().lstrip('1234567890. ') for q in response.text.strip().split('\n') if q.strip()]
        except Exception as e:
            print(f"AI Interview Questions Error: {e}")
            return []

    async def optimize_linkedin_summary(self, resume_text: str) -> str:
        if not self.model: return ""
        prompt = f"Write a compelling, keyword-rich LinkedIn 'About' section for this candidate based on their resume. Use a professional yet conversational tone. Do not mention AI or Gemini.\n\nRESUME: {resume_text[:4000]}"
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"AI LinkedIn Error: {e}")
            return ""

    async def enhance_project_bullets(self, project_text: str) -> List[str]:
        if not self.model: return []
        prompt = f"Take these project descriptions and rewrite them into high-impact, quantified resume bullet points using the Google/Amazon STAR/XYZ formula. Do not mention AI or Gemini.\n\nPROJECTS: {project_text[:2000]}"
        try:
            response = self.model.generate_content(prompt)
            return [b.strip() for b in response.text.strip().split('\n') if b.strip()]
        except Exception as e:
            print(f"AI Project Enhance Error: {e}")
            return []


ai_service = AIService()
