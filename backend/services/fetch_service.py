import aiohttp
from bs4 import BeautifulSoup
import re

class FetchService:
    async def fetch_jd(self, url: str) -> str:
        # SSRF Protection: Block private IPs and localhost
        if re.search(r"localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.", url):
            raise Exception("Access to private network addresses is prohibited.")
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url, timeout=10) as response:
                if response.status != 200:
                    raise Exception(f"Failed to fetch: {response.status}")
                html = await response.text()
                
                soup = BeautifulSoup(html, "html.parser")
                for s in soup(["script", "style", "nav", "footer", "header"]):
                    s.decompose()
                
                text = soup.get_text(separator=" ")
                return "\n".join([l.strip() for l in text.splitlines() if l.strip()])[:15000]

fetch_service = FetchService()
