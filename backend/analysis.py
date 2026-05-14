import math
import re
import os
from collections import Counter
from typing import List, Dict, Tuple, Any

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to", "for", "of", "as",
    "is", "was", "are", "were", "be", "been", "being", "it", "this", "that", "these", "those",
    "with", "by", "from", "into", "through", "during", "before", "after", "above", "below",
    "between", "under", "again", "further", "then", "once", "here", "there", "when", "where",
    "why", "how", "all", "each", "both", "few", "more", "most", "other", "some", "such", "no",
    "nor", "not", "only", "own", "same", "so", "than", "too", "very", "can", "will", "just",
    "should", "now", "about", "over", "out", "up", "down", "off", "also", "any", "your", "our",
    "their", "my", "her", "his", "its", "we", "you", "he", "she", "they", "what", "which",
    "who", "whom", "me", "are", "am", "do", "does", "did", "have", "has", "had", "been",
}

SYNONYMS = {
    "javascript": ["js", "ecmascript"],
    "typescript": ["ts"],
    "amazon web services": ["aws"],
    "machine learning": ["ml"],
    "user experience": ["ux"],
    "user interface": ["ui"],
    "continuous integration": ["ci"],
    "continuous delivery": ["cd"],
    "ci/cd": ["cicd"],
    "kubernetes": ["k8s"],
    "react": ["reactjs"],
    "node.js": ["node"],
}

ROLE_PATTERNS = [
    (re.compile(r"\b(senior|sr\.?|lead|principal|staff)\b", re.I), "Senior "),
    (re.compile(r"\b(junior|jr\.?|associate)\b", re.I), "Junior "),
    (re.compile(r"\b(mid|intermediate)\b", re.I), "Mid-level "),
    (re.compile(r"\b(intern|graduate|entry)\b", re.I), "Entry-level "),
]

SECTION_KEYWORDS = {
    "experience": [r"experience", r"work history", r"professional experience", r"employment"],
    "education": [r"education", r"academic", r"degree", r"bachelor", r"master", r"phd"],
    "skills": [r"skills", r"technical skills", r"competencies", r"tools", r"technologies"],
}


import aiohttp
from bs4 import BeautifulSoup

def normalize_text(text: str) -> str:
    return re.sub(r"[^\w\s-]+", " ", text.lower()).strip()


async def fetch_jd_from_url(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.get(url, timeout=10) as response:
            if response.status != 200:
                raise Exception(f"Failed to fetch URL: {response.status}")
            html = await response.text()
            
            soup = BeautifulSoup(html, "html.parser")
            # Remove script and style elements
            for script_or_style in soup(["script", "style"]):
                script_or_style.decompose()
            
            # Get text and clean it up
            text = soup.get_text(separator=" ")
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = "\n".join(chunk for chunk in chunks if chunk)
            
            return text[:15000] # Limit to 15k chars



def tokenize(text: str) -> list[str]:
    normalized = normalize_text(text)
    tokens = [tok for tok in normalized.split() if len(tok) > 1 and tok not in STOPWORDS]
    return tokens


def build_tfidf(documents: list[str]) -> tuple[list[dict[str, float]], dict[str, float]]:
    token_lists = [tokenize(doc) for doc in documents]
    df = Counter({})
    for tokens in token_lists:
        df.update(set(tokens))
    idf = {term: math.log(1 + len(documents) / (1 + count)) for term, count in df.items()}
    vecs = []
    for tokens in token_lists:
        tf = Counter(tokens)
        denom = math.sqrt(sum((count ** 2) for count in tf.values())) or 1.0
        vecs.append({term: (count / denom) * idf.get(term, 0.0) for term, count in tf.items()})
    return vecs, idf


def cosine_similarity(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(a.get(term, 0.0) * weight for term, weight in b.items())
    norm_a = math.sqrt(sum(weight * weight for weight in a.values()))
    norm_b = math.sqrt(sum(weight * weight for weight in b.values()))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0


def extract_keywords(text: str, top_n: int = 25) -> list[str]:
    _, idf = build_tfidf([text])
    tf = Counter(tokenize(text))
    scored = [(token, count * idf.get(token, 1.0)) for token, count in tf.items()]
    scored.sort(key=lambda item: item[1], reverse=True)
    return [term for term, _ in scored[:top_n]]


def extract_requirements(text: str) -> dict[str, list[str]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    mandatory = []
    preferred = []
    for line in lines:
        if re.search(r"\b(required|must|minimum|need to have|should have)\b", line, re.I):
            mandatory.append(line)
        elif re.search(r"\b(preferred|nice to have|bonus|optional)\b", line, re.I):
            preferred.append(line)
    return {"mandatory": mandatory[:8], "preferred": preferred[:8]}


def detect_level(text: str) -> str:
    for pattern, label in ROLE_PATTERNS:
        if pattern.search(text):
            return label.strip()
    return "Professional"


def detect_remote(text: str) -> str:
    if re.search(r"\bremote\b", text, re.I):
        return "remote"
    if re.search(r"\bhybrid\b", text, re.I):
        return "hybrid"
    if re.search(r"\bonsite\b|\bon-site\b|\bin office\b", text, re.I):
        return "onsite"
    return "unspecified"


def normalized_synonym_set(term: str) -> set[str]:
    base = normalize_text(term)
    values = {base}
    for key, aliases in SYNONYMS.items():
        if base == key or base in key or key in base:
            values.add(key)
            values.update(aliases)
        if base in aliases or any(alias in base for alias in aliases):
            values.add(key)
            values.update(aliases)
    return values


def match_keyword(token: str, keyword: str) -> bool:
    token = normalize_text(token)
    keyword = normalize_text(keyword)
    if token == keyword:
        return True
    if keyword in token or token in keyword:
        return True
    synonyms = normalized_synonym_set(keyword)
    return token in synonyms


def keyword_match_stats(jd_text: str, resume_text: str) -> tuple[list[str], list[str], float]:
    jd_keywords = extract_keywords(jd_text, top_n=40)
    resume_tokens = tokenize(resume_text)
    matched = []
    missing = []
    for keyword in jd_keywords:
        if any(match_keyword(token, keyword) for token in resume_tokens):
            matched.append(keyword)
        else:
            missing.append(keyword)
    ratio = len(matched) / len(jd_keywords) if jd_keywords else 0.0
    return matched, missing, ratio


def score_format(resume_text: str) -> float:
    score = 100.0
    if "\t" in resume_text:
        score -= 8
    if re.search(r"[█▓▒░]", resume_text):
        score -= 10
    if len(resume_text.splitlines()) < 12:
        score -= 10
    if len(resume_text.splitlines()) > 250:
        score -= 5
    return max(0.0, min(100.0, score))


def score_sections(resume_text: str) -> float:
    points = 0
    text = resume_text.lower()
    checks = [("experience", 30), ("education", 15), ("skills", 25), ("summary", 15), ("contact", 15)]
    for keyword, value in checks:
        if keyword in text:
            points += value
    if "experience" not in text and re.search(r"\b(worked|built|managed|led|developed)\b", text):
        points += 12
    return max(0.0, min(100.0, points))


def score_experience(resume_text: str, jd_text: str) -> float:
    resume_keywords = tokenize(resume_text)
    jd_keywords = tokenize(jd_text)
    if not resume_keywords or not jd_keywords:
        return 0.0
    common = sum(1 for token in set(resume_keywords) if token in jd_keywords)
    return max(0.0, min(100.0, common / len(set(jd_keywords)) * 100))


def score_skills(resume_text: str, jd_text: str) -> float:
    resume_tokens = tokenize(resume_text)
    jd_keywords = tokenize(jd_text)
    if not jd_keywords:
        return 50.0
    matched = sum(1 for token in set(jd_keywords) if token in resume_tokens)
    return max(0.0, min(100.0, matched / len(set(jd_keywords)) * 100))


def interpret_score(score: float) -> str:
    if score >= 85:
        return "Excellent ATS match"
    if score >= 70:
        return "Good match — minor improvements"
    if score >= 55:
        return "Fair match — significant improvements"
    return "Poor match — major overhaul recommended"


def analyze_resume(resume_text: str, jd_text: str) -> dict:
    cleaned_jd = normalize_text(jd_text)
    matched, missing, ratio = keyword_match_stats(jd_text, resume_text)
    corpus = [cleaned_jd, normalize_text(resume_text)]
    vecs, _ = build_tfidf(corpus)
    similarity = cosine_similarity(vecs[0], vecs[1]) * 100
    format_score = score_format(resume_text)
    section_score = score_sections(resume_text)
    experience_score = score_experience(resume_text, jd_text)
    skills_score = score_skills(resume_text, jd_text)
    overall = (
        ratio * 100 * 0.35
        + format_score * 0.15
        + section_score * 0.15
        + similarity * 0.2
        + skills_score * 0.15
    )
    jd_keywords = extract_keywords(jd_text, top_n=40)
    return {
        "overall": round(max(0.0, min(100.0, overall)), 1),
        "breakdown": {
            "keyword": round(ratio * 100, 1),
            "format": round(format_score, 1),
            "sections": round(section_score, 1),
            "experience": round(experience_score, 1),
            "skills": round(skills_score, 1),
        },
        "interpret": interpret_score(overall),
        "matchedKeywords": matched,
        "missingKeywords": missing,
        "jd": {
            "cleaned": cleaned_jd,
            "keywords": jd_keywords,
            "requirements": extract_requirements(jd_text),
            "context": {"level": detect_level(jd_text), "remote": detect_remote(jd_text)},
        },
    }


def suggest_jobs(jd_text: str) -> dict:
    keywords = extract_keywords(jd_text, top_n=20)
    text = jd_text.lower()
    titles = set()
    if re.search(r"\b(software engineer|software developer|devops|site reliability|sre|backend|frontend)\b", text):
        titles.add("Software Engineer")
    if re.search(r"\b(data scientist|machine learning|ml engineer|ai engineer)\b", text):
        titles.add("Machine Learning Engineer")
    if re.search(r"\b(product manager|project manager)\b", text):
        titles.add("Product Manager")
    if re.search(r"\b(qa|quality assurance|tester)\b", text):
        titles.add("Quality Assurance Engineer")
    if not titles:
        titles.add("Professional")
    recommended = [kw for kw in keywords if kw not in STOPWORDS][:12]
    return {
        "jobSuggestions": list(titles),
        "recommendedSkills": recommended,
        "summary": f"This role is best matched for {', '.join(list(titles)[:2])} with a focus on {', '.join(recommended[:5])}.",
    }


def extract_section(resume_text: str, section_name: str) -> str:
    lines = resume_text.splitlines()
    found = []
    capturing = section_name.lower() in [line.strip().lower() for line in lines[:3]]
    for line in lines:
        if section_name.lower() in line.lower():
            capturing = True
            continue
        if capturing and re.match(r"^[A-Z][A-Za-z ]{2,30}$", line.strip()):
            break
        if capturing:
            found.append(line)
    return "\n".join(found).strip()


def tailor_resume(resume_text: str, jd_text: str) -> dict:
    if model:
        try:
            prompt = f"""
            You are an expert ATS resume optimizer. Your task is to rewrite the provided resume to better align with the job description (JD).
            
            GUIDELINES:
            1. Use keywords from the JD naturally.
            2. Optimize the Professional Summary to highlight relevant experience.
            3. Rewrite Experience bullet points to use strong action verbs and quantify achievements where possible.
            4. Ensure the Skills section includes technical skills mentioned in the JD that are relevant to the candidate's background.
            5. Maintain 100% truthfulness - do not invent experience.
            6. Output ONLY the final resume in plain text with clear headers (CONTACT, SUMMARY, EXPERIENCE, EDUCATION, SKILLS).
            
            JOB DESCRIPTION:
            {jd_text}
            
            RESUME:
            {resume_text}
            """
            response = model.generate_content(prompt)
            return {"tailored": response.text.strip()}
        except Exception as e:
            print(f"Gemini Tailoring Error: {e}")
            # Fallback to heuristic tailoring
    
    # Heuristic fallback (improved)
    summary = extract_section(resume_text, "summary") or extract_section(resume_text, "profile")
    keywords = extract_keywords(jd_text, top_n=30)
    missing_keywords = [kw for kw in keywords if kw not in normalize_text(resume_text)]
    
    summary_line = summary or "Experienced professional with strong delivery experience."
    summary_line = summary_line.strip()
    extra_phrases = []
    for kw in missing_keywords[:5]:
        if kw.lower() not in summary_line.lower():
            extra_phrases.append(kw)
    if extra_phrases:
        summary_line = f"{summary_line} Skilled in {', '.join(extra_phrases)}."
    
    skills_section = extract_section(resume_text, "skills")
    if not skills_section:
        skills_section = ", ".join(missing_keywords[:10])
    else:
        skills_section = skills_section.strip() + ", " + ", ".join([kw for kw in missing_keywords[:8] if kw not in normalize_text(skills_section)])
    
    tailored = ["CONTACT"]
    contact_lines = [line for line in resume_text.splitlines() if re.search(r"\b(@|linkedin\.com|github\.com|\+?\d{7,})\b", line, re.I)]
    tailored.extend(contact_lines[:5])
    tailored.append("\nSUMMARY")
    tailored.append(summary_line)
    tailored.append("\nEXPERIENCE")
    # Simple experience extraction: remove common headers
    exp_lines = [line for line in resume_text.splitlines() if line.strip() and not line.strip().lower().startswith(("summary", "profile", "skills", "education", "certification", "certifications", "projects"))]
    tailored.extend(exp_lines)
    tailored.append("\nSKILLS")
    tailored.append(skills_section)
    tailored.append("\nEDUCATION")
    education_section = extract_section(resume_text, "education")
    tailored.append(education_section or "Degree details as provided.")
    
    return {"tailored": "\n".join(tailored).strip()}

def chat_with_resume(message: str, resume_text: str, jd_text: str, chat_history: List[Dict[str, str]] = None) -> str:
    if not model:
        return "AI Chat is unavailable (API Key not set)."
    
    try:
        context = f"Candidate Resume: {resume_text[:4000]}\n\nJob Description: {jd_text[:4000]}"
        
        # Simple RAG concept: provide context in the system prompt
        system_instruction = f"""
        You are ResumeAI Assistant, a career coach helping job seekers optimize their resumes for ATS.
        Use the provided context (Resume and JD) to answer questions accurately and concisely.
        If asked for improvements, be specific and use data from the resume/JD.
        
        CONTEXT:
        {context}
        """
        
        # Format chat history for Gemini
        history = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                history.append({"role": role, "parts": [msg["content"]]})
        
        chat = model.start_chat(history=history)
        response = chat.send_message(message)
        return response.text.strip()
    except Exception as e:
        return f"Chat Error: {str(e)}"

def get_ai_suggestions(resume_text: str, jd_text: str, score: float) -> List[Dict[str, Any]]:
    if not model:
        return []
    
    try:
        prompt = f"""
        Given the resume and JD, and a current ATS score of {score}/100, provide exactly 10 concise, high-impact suggestions to improve the resume.
        Return as a JSON list of objects: {{"title": "...", "detail": "...", "impact": "critical|important|optional", "category": "..."}}
        
        RESUME: {resume_text[:5000]}
        JD: {jd_text[:5000]}
        """
        response = model.generate_content(prompt)
        # Extract JSON from response
        match = re.search(r"\[.*\]", response.text, re.DOTALL)
        if match:
            import json
            return json.loads(match.group())
        return []
    except Exception as e:
        print(f"Suggestions Error: {e}")
        return []

