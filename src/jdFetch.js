const PY_BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
? "http://127.0.0.1:8088" 
: "https://resume-ai-backend.onrender.com";

/**
 * Fetches a job posting URL via the Python backend.
 * @param {string} urlString
 * @returns {Promise<string>}
 */
export async function fetchJdFromUrl(urlString) {
  const trimmed = urlString.trim();
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http/https links are supported.");
  }

  const res = await fetch(`${PY_BACKEND_URL}/api/fetch-jd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: u.href }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  
  const text = data.text.trim();
  if (!text) {
    throw new Error("Empty response from URL (blocked page or non-text content). Paste the JD manually.");
  }
  return text;
}
