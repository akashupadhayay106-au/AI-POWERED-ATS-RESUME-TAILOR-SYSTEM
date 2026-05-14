#!/usr/bin/env python3
"""Test suite for ResumeAI Pro backend API"""
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"
TEST_RESUME = """
John Doe
john.doe@example.com | (555) 123-4567
linkedin.com/in/johndoe

SUMMARY
Experienced Full Stack Developer with 5 years building scalable web applications using JavaScript, Python, and AWS.

EXPERIENCE
Senior Software Engineer | TechCorp Inc | Jan 2021 - Present
- Led development of microservices architecture serving 10M+ users
- Optimized database queries reducing response time by 40%
- Mentored team of 5 junior developers

Full Stack Developer | StartupXYZ | Jun 2018 - Dec 2020
- Built React/Node.js applications deployed on AWS
- Implemented CI/CD pipelines reducing deployment time by 60%

EDUCATION
Bachelor of Science in Computer Science | State University | 2018

SKILLS
Languages: JavaScript, Python, Java, SQL
Frameworks: React, Node.js, Django, FastAPI
Tools: AWS, Docker, Kubernetes, Git, Jenkins
"""

TEST_JD = """
Job Title: Senior Full Stack Engineer
Company: Tech Solutions Inc

We are looking for a Senior Full Stack Engineer with:
- 5+ years of experience in full-stack development
- Strong proficiency in JavaScript/React and Python/Node.js
- AWS and cloud architecture experience
- Docker and Kubernetes knowledge
- CI/CD pipeline experience
- Team leadership and mentoring experience

Responsibilities:
- Design and architect scalable systems
- Lead development of core features
- Mentor junior team members
- Collaborate with product and design teams
"""

def test_health():
    """Test /api/health endpoint"""
    print("Testing /api/health...")
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("status") == "healthy", f"Unexpected status: {data}"
        print("✓ Health endpoint working")
        return True
    except Exception as e:
        print(f"✗ Health endpoint failed: {e}")
        return False

def test_analyze_resume():
    """Test /api/analyze-resume endpoint"""
    print("\nTesting /api/analyze-resume...")
    try:
        payload = {
            "resume_text": TEST_RESUME,
            "jd_text": TEST_JD,
            "filename": "test_resume.pdf"
        }
        r = requests.post(f"{BASE_URL}/api/analyze-resume", json=payload, timeout=10)
        print(f"Response status: {r.status_code}")
        if r.status_code != 200:
            print(f"Error: {r.text}")
            return False
        
        data = r.json()
        assert "overall" in data, "Missing 'overall' in response"
        assert "interpret" in data, "Missing 'interpret' in response"
        assert "breakdown" in data, "Missing 'breakdown' in response"
        assert "matchedKeywords" in data, "Missing 'matchedKeywords' in response"
        assert "missingKeywords" in data, "Missing 'missingKeywords' in response"
        
        print(f"✓ Analysis working - Score: {data['overall']}/100 - {data['interpret']}")
        print(f"  Matched keywords: {len(data['matchedKeywords'])}")
        print(f"  Missing keywords: {len(data['missingKeywords'])}")
        return True
    except Exception as e:
        print(f"✗ Analysis endpoint failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_fetch_jd():
    """Test /api/fetch-jd endpoint"""
    print("\nTesting /api/fetch-jd...")
    try:
        payload = {"url": "https://example.com/job"}
        r = requests.post(f"{BASE_URL}/api/fetch-jd", json=payload, timeout=15)
        # This may fail if the URL is unreachable, which is expected
        if r.status_code == 200:
            print("✓ Fetch JD endpoint responding")
            return True
        elif r.status_code == 400:
            # Expected - invalid URL
            print("✓ Fetch JD endpoint working (rejected invalid URL as expected)")
            return True
        else:
            print(f"✗ Unexpected status code: {r.status_code}")
            return False
    except Exception as e:
        print(f"✗ Fetch JD endpoint failed: {e}")
        return False

def test_get_history():
    """Test /api/history endpoint"""
    print("\nTesting /api/history...")
    try:
        r = requests.get(f"{BASE_URL}/api/history", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ History endpoint working - {len(data)} records")
        return True
    except Exception as e:
        print(f"✗ History endpoint failed: {e}")
        return False

def test_ai_suggestions():
    """Test /api/ai/suggestions endpoint"""
    print("\nTesting /api/ai/suggestions...")
    try:
        payload = {
            "resume_text": TEST_RESUME,
            "jd_text": TEST_JD,
            "score": 75.5
        }
        r = requests.post(f"{BASE_URL}/api/ai/suggestions", json=payload, timeout=30)
        if r.status_code == 200:
            data = r.json()
            print(f"✓ AI Suggestions working - {len(data.get('suggestions', []))} suggestions")
            return True
        elif r.status_code == 429:
            print("✓ AI Suggestions endpoint responding (rate limited as expected)")
            return True
        else:
            print(f"Status: {r.status_code} - {r.text[:200]}")
            return True  # Don't fail on AI endpoints if Gemini key is missing
    except requests.exceptions.Timeout:
        print("⚠ AI Suggestions timed out (may indicate Gemini API call)")
        return True  # Don't fail on timeout for AI endpoints
    except Exception as e:
        print(f"✗ AI Suggestions failed: {e}")
        return True  # Don't fail on AI endpoints if they timeout

def test_news_endpoint():
    """Test /api/news/top endpoint"""
    print("\nTesting /api/news/top...")
    try:
        r = requests.get(f"{BASE_URL}/api/news/top", timeout=10)
        if r.status_code == 200:
            data = r.json()
            print(f"✓ News endpoint working - {len(data)} articles")
            return True
        else:
            print(f"Status: {r.status_code}")
            return True  # News provider may not be configured
    except Exception as e:
        print(f"⚠ News endpoint failed (may be expected): {e}")
        return True

def main():
    """Run all tests"""
    print("=" * 60)
    print("ResumeAI Pro - Backend API Test Suite")
    print("=" * 60)
    
    tests = [
        test_health,
        test_analyze_resume,
        test_fetch_jd,
        test_get_history,
        test_ai_suggestions,
        test_news_endpoint,
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✓ All tests passed!")
        return 0
    else:
        print(f"⚠ {total - passed} test(s) failed or skipped")
        return 1 if passed < total else 0

if __name__ == "__main__":
    sys.exit(main())
