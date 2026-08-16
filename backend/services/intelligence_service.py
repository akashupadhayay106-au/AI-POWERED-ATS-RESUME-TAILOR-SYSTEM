import re
from typing import List, Dict, Any

class IntelligenceService:
    def __init__(self):
        # Expanded action verbs for detection
        self.action_verbs = {
            "led", "managed", "developed", "architected", "optimized", "implemented", 
            "designed", "engineered", "accelerated", "pioneered", "transformed",
            "streamlined", "spearheaded", "orchestrated", "navigated", "delivered",
            "increased", "reduced", "saved", "improved", "launched", "created",
            "negotiated", "mentored", "coordinated", "automated", "modernized"
        }
        # Weak words to flag
        self.weak_words = {
            "helped", "assisted", "responsible for", "handled", "worked on", 
            "participated", "familiar with", "learning", "team player", "knowledge of",
            "involved in", "tasks included", "duties were"
        }

    def detect_weak_bullets(self, text: str) -> List[Dict[str, Any]]:
        # Improved bullet detection: splitting by common bullet points and newlines
        raw_lines = [l.strip() for l in text.splitlines() if l.strip()]
        bullets = []
        for line in raw_lines:
            if line.startswith(('•', '-', '*', '√')) or len(line) > 40:
                bullets.append(line.lstrip('•-*√ ').strip())

        feedback = []
        seen_issues = set()
        
        for bullet in bullets:
            reasons = []
            # 1. Check for missing metrics (Quantification)
            if not re.search(r'\d+%|\$\d+|\b(million|billion|thousand|users|revenue|reduced|increased|improved|saved|delivered|percentage|ratio)\b', bullet, re.I):
                reasons.append("Missing quantifiable metrics (e.g., %, $, numbers)")
            
            # 2. Check for weak words
            found_weak = [weak for weak in self.weak_words if weak in bullet.lower()]
            if found_weak:
                reasons.append(f"Uses passive/weak language (e.g., '{found_weak[0]}')")
            
            # 3. Check for action verb at start
            words = bullet.split()
            if words:
                # Remove non-alphabetic chars from first word
                first_word = re.sub(r'[^a-zA-Z]', '', words[0].lower())
                if first_word not in self.action_verbs and not (first_word.endswith('ed') or first_word.endswith('ing')):
                    reasons.append("Should start with a strong action verb (e.g., 'Led', 'Optimized')")

            if reasons:
                issue_key = "|".join(reasons)
                # Avoid repeating the exact same set of issues too many times
                if issue_key not in seen_issues or len(feedback) < 5:
                    feedback.append({
                        "bullet": bullet[:120] + "..." if len(bullet) > 120 else bullet,
                        "issues": reasons,
                        "suggestion": "Rewrite using the STAR (Situation, Task, Action, Result) or Google XYZ formula."
                    })
                    seen_issues.add(issue_key)
        
        return feedback[:8] # Limit to top 8 unique feedback items

    def get_bullet_score(self, weak_bullets: List[Any], total_bullets: int) -> float:
        if total_bullets == 0: return 0.0
        # Penalize more for weak bullets but with a floor
        penalty = (len(weak_bullets) / max(total_bullets, 1)) * 100
        score = max(10, 100 - penalty)
        return round(score, 1)

    def classify_jd_skills(self, jd_text: str) -> Dict[str, List[str]]:
        # Comprehensive rule-based classification
        categories = {
            "technical_skills": [],
            "soft_skills": [],
            "tools": [],
            "qualifications": [],
            "industries": []
        }
        
        patterns = {
            "technical_skills": r'\b(python|java|javascript|react|aws|cloud|sql|machine learning|data science|api|devops|docker|kubernetes|typescript|node|express|fastapi|django|flask|golang|rust|cpp|linux|bash|html|css|nosql|mongodb|postgresql|redis|graphql)\b',
            "soft_skills": r'\b(leadership|communication|teamwork|agile|scrum|problem solving|analytical|mentor|collaboration|management|strategy|critical thinking|adaptability|time management|empathy)\b',
            "tools": r'\b(jira|git|github|trello|slack|vscode|docker|jenkins|terraform|postman|swagger|figma|canva|notion|confluence|bitbucket|gitlab|kubernetes|ansible|prometheus|grafana)\b',
            "qualifications": r'\b(bachelor|master|phd|degree|certification|years experience|senior|junior|lead|principal|staff|expert|aws certified|pmp|cpa)\b',
            "industries": r'\b(fintech|healthcare|ecommerce|saas|ai|security|gaming|finance|banking|education|logistics)\b'
        }
        
        jd_lower = jd_text.lower()
        for cat, pattern in patterns.items():
            matches = set(re.findall(pattern, jd_lower, re.I))
            categories[cat] = sorted(list(matches))
            
        return categories

    def get_role_alignment_score(self, resume_text: str, jd_intel: Dict[str, List[str]]) -> float:
        resume_lower = resume_text.lower()
        total_required = sum(len(skills) for skills in jd_intel.values())
        if total_required == 0: return 100.0
        
        matched = 0
        for skills in jd_intel.values():
            for skill in skills:
                if skill in resume_lower:
                    matched += 1
                    
        return round((matched / total_required * 100), 1)

    def get_role_fit(self, score: float) -> str:
        if score >= 85: return "High"
        if score >= 60: return "Medium"
        return "Low"

intelligence_service = IntelligenceService()
