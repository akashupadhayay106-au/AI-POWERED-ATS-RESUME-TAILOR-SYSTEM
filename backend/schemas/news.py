from pydantic import BaseModel
from typing import List, Optional

class NewsArticle(BaseModel):
    title: Optional[str]
    source: Optional[str]
    published_at: Optional[str]
    description: Optional[str]
    url: Optional[str]
    urlToImage: Optional[str]

class PersonalizedNewsRequest(BaseModel):
    role: Optional[str] = "technology"
    domain: Optional[str] = "career"
