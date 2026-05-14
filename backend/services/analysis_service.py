import math
from collections import Counter
from typing import List, Dict, Tuple, Any
from utils.text_processing import tokenize, normalize_text, compute_readability
from services.intelligence_service import intelligence_service

class AnalysisService:
    def extract_keywords(self, text: str, top_n: int = 30) -> List[str]:
        tokens = tokenize(text)
        count = Counter(tokens)
        # Basic TF-IDF style scoring for single doc
        scored = [(t, c) for t, c in count.items()]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [t for t, _ in scored[:top_n]]

    def calculate_cosine_similarity(self, text1: str, text2: str) -> float:
        vec1 = Counter(tokenize(text1))
        vec2 = Counter(tokenize(text2))
        
        intersection = set(vec1.keys()) & set(vec2.keys())
        numerator = sum([vec1[x] * vec2[x] for x in intersection])

        sum1 = sum([vec1[x]**2 for x in vec1.keys()])
        sum2 = sum([vec2[x]**2 for x in vec2.keys()])
        denominator = math.sqrt(sum1) * math.sqrt(sum2)

        if not denominator:
            return 0.0
        else:
            return float(numerator) / denominator

    def analyze(self, resume_text: str, jd_text: str) -> Dict[str, Any]:
        jd_keywords = self.extract_keywords(jd_text, top_n=40)
        resume_tokens = set(tokenize(resume_text))
        
        matched = [kw for kw in jd_keywords if kw in resume_tokens]
        missing = [kw for kw in jd_keywords if kw not in resume_tokens]
        
        keyword_score = (len(matched) / len(jd_keywords) * 100) if jd_keywords else 0
        similarity = self.calculate_cosine_similarity(resume_text, jd_text) * 100
        
        # Heuristic components
        format_score = 90.0 # Placeholder
        if "\t" in resume_text: format_score -= 10
        
        section_score = 0
        for s in ["experience", "education", "skills", "summary"]:
            if s in resume_text.lower(): section_score += 25
            
        overall = (keyword_score * 0.4) + (similarity * 0.3) + (section_score * 0.2) + (format_score * 0.1)
        
        fit = intelligence_service.get_role_fit(overall)
        readability = compute_readability(resume_text)
        
        # New Intelligence Modules
        weak_bullets = intelligence_service.detect_weak_bullets(resume_text)
        jd_intel = intelligence_service.classify_jd_skills(jd_text)
        
        return {
            "overall": round(overall, 1),
            "interpret": self.get_interpret(overall),
            "breakdown": {
                "keyword": round(keyword_score, 1),
                "similarity": round(similarity, 1),
                "sections": section_score,
                "format": format_score,
                "readability": readability["score"]
            },
            "matchedKeywords": matched,
            "missingKeywords": missing,
            "jd": {"keywords": jd_keywords},
            "fit_prediction": fit,
            "explanation": f"Your resume matches {len(matched)} key terms and has a {round(similarity)}% semantic alignment with the role.",
            "weak_bullets": weak_bullets,
            "jd_intelligence": jd_intel
        }

    def get_interpret(self, score: float) -> str:
        if score >= 85: return "Excellent Match"
        if score >= 70: return "Good Match"
        if score >= 55: return "Fair Match"
        return "Poor Match"

analysis_service = AnalysisService()
