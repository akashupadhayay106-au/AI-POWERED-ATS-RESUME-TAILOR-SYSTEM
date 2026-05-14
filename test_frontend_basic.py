#!/usr/bin/env python3
import requests
import time
import sys

print("Waiting for frontend server...")
time.sleep(2)

try:
    r = requests.get("http://localhost:5173/", timeout=10)
    print(f"✓ Frontend server responding - Status: {r.status_code}")
    print(f"  Content length: {len(r.text)} bytes")
    if "<!DOCTYPE" in r.text or "<html" in r.text:
        print("✓ Valid HTML content received")
        # Check for key elements
        if "ResumeAI" in r.text:
            print("✓ ResumeAI branding found")
        if "resume" in r.text.lower():
            print("✓ Resume-related content found")
    else:
        print("⚠ Response doesn't look like HTML")
        print(f"  First 300 chars: {r.text[:300]}")
    sys.exit(0)
except requests.exceptions.ConnectionError as e:
    print(f"✗ Cannot connect to frontend server: {e}")
    sys.exit(1)
except requests.exceptions.Timeout:
    print("✗ Frontend server is not responding (timeout)")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error testing frontend: {e}")
    sys.exit(1)
