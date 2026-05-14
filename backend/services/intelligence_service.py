import re
from typing import List, Dict, Any

class IntelligenceService:
    def __init__(self):
        # Strong action verbs for detection
        self.action_verbs = {
            "led", "managed", "developed", "architected", "optimized", "implemented", 
            "designed", "engineered", "accelerated", "pioneered", "transformed",
            "streamlined", "spearheaded", "orchestrated", "navigated"
        }
        # Weak words to flag
        self.weak_words = {
            "helped", "assisted", "responsible for", "handled", "worked on", 
            "participated", "familiar with", "learning", "team player"
        }

    def detect_weak_bullets(self, text: str) -> List[Dict[str, Any]]:
        bullets = [line.strip() for line in text.splitlines() if line.strip().startswith(('•', '-', '*')) or len(line.strip()) > 20]
        feedback = []
        
        for bullet in bullets:
            reasons = []
            # Check for missing metrics
            if not re.search(r'\d+%|\$\d+|\b(million|billion|thousand|users|revenue|reduced|increased)\b', bullet, re.I):
                reasons.append("Missing quantifiable metrics (e.g., %, $, numbers)")
            
            # Check for weak verbs
            if any(weak in bullet.lower() for weak in self.weak_words):
                reasons.append("Uses passive/weak language (e.g., 'helped', 'responsible for')")
            
            # Check for action verb at start
            words = bullet.split()
            if words and words[0].lower().rstrip('ed') + 'ed' not in self.action_verbs:
                if len(words) > 0 and words[0].lower() not in self.action_verbs:
                    reasons.append("Should ideally start with a strong action verb")

            if reasons:
                feedback.append({
                    "bullet": bullet[:100] + "..." if len(bullet) > 100 else bullet,
                    "issues": reasons,
                    "suggestion": "Rewrite to focus on impact and use quantified results."
                })
        
        return feedback

    def classify_jd_skills(self, jd_text: str) -> Dict[str, List[str]]:
        # Basic rule-based classification (can be upgraded to NER model later)
        categories = {
            "technical_skills": [],
            "soft_skills": [],
            "tools": [],
            "qualifications": []
        }
        
        # Simple patterns
        patterns = {
            "technical_skills": r'\b(python|java|javascript|react|aws|cloud|sql|machine learning|data science|api|devops|docker|kubernetes)\b',
            "soft_skills": r'\b(leadership|communication|teamwork|agile|scrum|problem solving|analytical|mentor)\b',
            "tools": r'\b(jira|git|github|trello|slack|vscode|docker|jenkins|terraform)\b',
            "qualifications": r'\b(bachelor|master|phd|degree|certification|years experience|senior|junior)\b'
        }
        
        jd_lower = jd_text.lower()
        for cat, pattern in patterns.items():
            matches = set(re.findall(pattern, jd_lower, re.I))
            categories[cat] = list(matches)
            
        return categories

    def get_role_fit(self, score: float) -> str:
        if score >= 85: return "High"
        if score >= 60: return "Medium"
        return "Low"

intelligence_service = IntelligenceService()
