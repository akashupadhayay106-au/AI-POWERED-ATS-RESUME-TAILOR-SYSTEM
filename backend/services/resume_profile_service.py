import google.generativeai as genai
import json
import re
from config import settings
from schemas.job import ResumeProfile

class ResumeProfileService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-3-flash-preview')
        else:
            self.model = None

    async def extract_profile(self, resume_text: str) -> ResumeProfile:
        if not self.model:
            # Fallback to very basic extraction if Gemini is not available
            return ResumeProfile(
                probable_roles=["Professional"],
                skills=[],
                seniority="Unknown",
                domain="General",
                tools=[]
            )

        prompt = f"""
        Analyze the following resume text and extract professional profile information.
        Return ONLY a JSON object with the following keys:
        - probable_roles (List of strings, e.g., ["Software Engineer", "Full Stack Developer"])
        - skills (List of strings, technical skills)
        - seniority (String, one of: "Fresher", "Junior", "Intermediate", "Senior", "Lead", "Architect", "Executive")
        - domain (String, e.g., "FinTech", "Healthcare", "E-commerce")
        - tools (List of strings, e.g., ["Docker", "AWS", "Jira"])

        RESUME TEXT:
        {resume_text[:8000]}
        """

        try:
            response = self.model.generate_content(prompt)
            # Extract JSON from response
            match = re.search(r"\{.*\}", response.text, re.DOTALL)
            if match:
                data = json.loads(match.group())
                return ResumeProfile(**data)
        except Exception as e:
            print(f"Error extracting profile: {e}")
            
        return ResumeProfile(
            probable_roles=["Professional"],
            skills=[],
            seniority="Unknown",
            domain="General",
            tools=[]
        )

resume_profile_service = ResumeProfileService()
