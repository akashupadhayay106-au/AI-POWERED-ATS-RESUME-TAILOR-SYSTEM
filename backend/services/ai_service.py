import google.generativeai as genai
from config import settings
from typing import List, Dict, Any, Optional
import os

class AIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        # Read model name from env, default to gemini-1.5-flash
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        if self.api_key and "your_" not in self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(self.model_name)
                print(f"Gemini AI initialized with model: {self.model_name}")
            except Exception as e:
                print(f"CRITICAL: Failed to initialize Gemini AI: {e}")
                self.model = None
        else:
            print("WARNING: GEMINI_API_KEY is missing or invalid. AI features will be disabled.")
            self.model = None

    async def _safe_generate(self, prompt: str, fallback: Any) -> Any:
        if not self.model:
            return fallback
        
        try:
            # Mask sensitive info if any (though keys shouldn't be in prompts)
            # prompt = self._mask_secrets(prompt)
            
            # Using asyncio to prevent blocking if needed, though genai is mostly async-ready
            response = self.model.generate_content(prompt)
            return response
        except Exception as e:
            print(f"Gemini API Error: {e}")
            return fallback

    async def get_suggestions(self, resume_text: str, jd_text: str, score: float) -> List[Dict[str, Any]]:
        prompt = f"""
        Analyze the resume against the JD (Score: {score}/100).
        Provide 10 actionable suggestions in JSON format. Do not mention AI or Gemini in the text.
        [{{"title": "...", "detail": "...", "impact": "critical|important|optional", "category": "..."}}]
        
        RESUME: {resume_text[:5000]}
        JD: {jd_text[:5000]}
        """
        response = await self._safe_generate(prompt, None)
        if not response: return []
        
        try:
            import json, re
            match = re.search(r"\[.*\]", response.text, re.DOTALL)
            return json.loads(match.group()) if match else []
        except Exception as e:
            print(f"AI Suggestions Parsing Error: {e}")
            return []

    async def tailor_resume(self, resume_text: str, jd_text: str) -> Dict[str, str]:
        if not self.model: return {"tailored": "AI career assistant is currently busy.", "latex": ""}
        
        from services.rag_service import rag_service
        
        is_neutral = not jd_text or not jd_text.strip()
        is_sparse = len(resume_text.strip()) < 150
        
        if is_sparse:
            # Fallback prompt for sparse resumes
            prompt = f"""
            You are a world-class Executive Resume Architect. 
            The provided resume is extremely sparse or incomplete. Based strictly on the minimal details provided, identify the candidate's probable job title/role (if not clear, assume "Software Engineer / IT Professional").
            
            STRICT TRUTH-PRESERVATION RULES:
            - DO NOT invent fake past employers, specific degrees, or certifications.
            - Generate generic, industry-standard, and background-neutral experience bullet points using the Google STAR/XYZ formula (Accomplished X as measured by Y, by doing Z) that align with their job title.
            - Keep skills completely truthful to what is in the resume, adding only standard generic skills suitable for the identified title.
            
            NEUTRAL OPTIMIZATION OBJECTIVES:
            1. PROFESSIONAL SUMMARY: Write a concise (3-4 sentences), impact-driven professional summary.
            2. RESULTS-ORIENTED EXPERIENCE: Generate standard, realistic bullet points demonstrating execution, analysis, and problem-solving.
            3. LATEX EXCELLENCE: Provide a premium, structured LaTeX document.

            INPUT RESUME TEXT: {resume_text}
            
            OUTPUT REQUIREMENT:
            Return ONLY a JSON object with:
            - "tailored_text": The optimized plain text resume.
            - "latex_code": A full, valid, and beautiful LaTeX document (using geometry, hyperref, and enumitem packages).
            """
        elif is_neutral:
            prompt = f"""
            You are a world-class Executive Resume Architect. 
            Your goal is to optimize the provided resume for professional impact, formatting clarity, and ATS parsing readiness, while maintaining 100% factual accuracy.

            STRICT TRUTH-PRESERVATION RULES:
            - NEVER invent experience, skills, certifications, or achievements.
            - NEVER hallucinate company names, dates, or degrees.
            - Keep skills completely truthful to what is in the resume, and categorize them professionally.
            
            NEUTRAL OPTIMIZATION OBJECTIVES:
            1. PROFESSIONAL SUMMARY: Rewrite the professional summary to be concise (3-4 sentences), impact-driven, and neutral. Do NOT force a role (like "Data Analyst" or "Software Engineer") unless the candidate's history clearly reflects it.
            2. SKILLS ENHANCEMENT: Extract the core skills present in the resume. Categorize them logically (e.g., Technical, Soft Skills, Tools) without adding unmentioned technologies or competencies. Use truthful, background-neutral skills based ONLY on the candidate's text.
            3. RESULTS-ORIENTED BULLETS: Rewrite weak, description-heavy bullets into results-oriented achievements using the Google STAR/XYZ formula, using only facts present in the text.
            4. LATEX EXCELLENCE: Provide a premium, structured LaTeX document that looks sophisticated and modern.

            INPUT DATA:
            RESUME: {resume_text[:4000]}
            
            OUTPUT REQUIREMENT:
            Return ONLY a JSON object with:
            - "tailored_text": The optimized plain text resume.
            - "latex_code": A full, valid, and beautiful LaTeX document (using geometry, hyperref, and enumitem packages).
            """
        else:
            # Build vector retrieval index and retrieve top k most relevant chunks
            retrieved_context = rag_service.retrieve_relevant_context(resume_text, jd_text, k=4)
            
            prompt = f"""
            You are a world-class Executive Resume Architect and ATS Optimization Expert. 
            Your goal is to tailor the provided resume to perfectly align with the target Job Description (JD) using the semantically retrieved resume context.

            STRICT TRUTH-PRESERVATION RULES:
            - NEVER invent experience, skills, certifications, or achievements.
            - NEVER hallucinate company names, dates, or degrees.
            - If a JD requirement is missing from the resume, DO NOT add it. Instead, pivot to related transferable skills that ARE in the resume.
            - Focus strictly on matching their actual experience, retrieved below, to the JD keywords.

            TAILORING OBJECTIVES:
            1. STRATEGIC KEYWORD INTEGRATION: Naturally weave in high-priority keywords from the JD into the Summary, Skills, and Experience sections based on the retrieved context.
            2. IMPACT-DRIVEN BULLETS: Transform weak, task-oriented bullets from the retrieved context into high-impact, results-oriented achievements using the Google XYZ formula (Accomplished X as measured by Y, by doing Z).
            3. ROLE ALIGNMENT: Adjust the professional summary to highlight the candidate's value proposition specifically for this role.
            4. ATS FRIENDLINESS: Maintain a clean, single-column structure that is easily parsed by all major ATS platforms.
            5. LATEX EXCELLENCE: Provide a premium, structured LaTeX document that looks sophisticated and modern.

            INPUT DATA:
            JD: {jd_text[:4000]}
            SEMANTICALLY RETRIEVED RESUME CONTEXT: {retrieved_context}
            FULL RESUME: {resume_text[:4000]}
            
            OUTPUT REQUIREMENT:
            Return ONLY a JSON object with:
            - "tailored_text": The optimized plain text resume.
            - "latex_code": A full, valid, and beautiful LaTeX document (using geometry, hyperref, and enumitem packages).
            """

        try:
            response = self.model.generate_content(prompt)
            import json, re
            # Improved JSON extraction with better regex and fallback
            text = response.text
            json_match = re.search(r"\{[\s\S]*\}", text)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                except:
                    # Clean up common AI markdown artifacts
                    cleaned = json_match.group().replace("```json", "").replace("```", "").strip()
                    data = json.loads(cleaned)
            else:
                data = {"tailored_text": text, "latex_code": ""}
                
            return {
                "tailored": data.get("tailored_text", ""),
                "latex": data.get("latex_code", "")
            }
        except Exception as e:
            print(f"Tailoring Error: {e}")
            return {"tailored": f"Error during tailoring: {str(e)}", "latex": ""}

    async def chat(self, message: str, resume_text: str, jd_text: str, history: List[Dict[str, str]] = None, score: float = None) -> str:
        if not self.model: return "Chat service is temporarily busy. Please try again."
        score_info = f"\nCurrent ATS Score: {score}%" if score is not None else ""
        context = f"Resume: {resume_text[:3000]}\nJD: {jd_text[:3000]}{score_info}"
        
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
