import re
from typing import List, Set
import math
from collections import Counter

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to", "for", "of", "as",
    "is", "was", "are", "were", "be", "been", "being", "it", "this", "that", "these", "those",
    "with", "by", "from", "into", "through", "during", "before", "after", "above", "below",
    "between", "under", "again", "further", "then", "once", "here", "there", "when", "where",
    "why", "how", "all", "each", "both", "few", "more", "most", "other", "some", "such", "no",
    "nor", "not", "only", "own", "same", "so", "than", "too", "very", "can", "will", "just",
    "should", "now", "about", "over", "out", "up", "down", "off", "also", "any", "your", "our",
    "their", "my", "her", "his", "its", "we", "you", "he", "she", "they", "what", "which",
    "who", "whom", "me", "are", "am", "do", "does", "did", "have", "has", "had",
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

def normalize_text(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"[^\w\s-]+", " ", text.lower()).strip()

def tokenize(text: str) -> List[str]:
    normalized = normalize_text(text)
    tokens = [tok for tok in normalized.split() if len(tok) > 1 and tok not in STOPWORDS]
    return tokens

def count_syllables(word: str) -> int:
    word = word.lower()
    if len(word) <= 3: return 1
    word = re.sub(r'(?:[^laeiouy]es|ed|[^laeiouy]e)$', '', word)
    word = re.sub(r'^y', '', word)
    syl = re.findall(r'[aeiouy]{1,2}', word)
    return len(syl) if syl else 1

def compute_readability(text: str) -> dict:
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if len(s.strip()) > 0]
    words = [w for w in text.split() if len(w) > 0]
    
    if not words or not sentences:
        return {"score": 0, "interpret": "N/A"}
    
    total_syllables = sum(count_syllables(w) for w in words)
    asl = len(words) / len(sentences)
    asw = total_syllables / len(words)
    
    # Flesch Reading Ease
    score = 206.835 - 1.015 * asl - 84.6 * asw
    
    interpret = "Professional"
    if score > 90: interpret = "Very Easy"
    elif score > 80: interpret = "Easy"
    elif score > 70: interpret = "Fairly Easy"
    elif score > 60: interpret = "Standard"
    elif score > 50: interpret = "Fairly Difficult"
    elif score > 30: interpret = "Difficult"
    else: interpret = "Very Difficult"
    
    return {"score": round(max(0, min(100, score))), "interpret": interpret}
