from fastapi import APIRouter, HTTPException, Request
from typing import List
from schemas.news import NewsArticle, PersonalizedNewsRequest
from services.news_service import news_service
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/news", tags=["news"])
limiter = Limiter(key_func=get_remote_address)

@router.get("/top", response_model=List[NewsArticle])
@limiter.limit("10/minute")
async def get_top_news(request: Request):
    try:
        return await news_service.get_top_career_news()
    except Exception as e:
        # Graceful fallback
        return []

@router.post("/personalized", response_model=List[NewsArticle])
@limiter.limit("5/minute")
async def get_personalized_news(request: Request, data: PersonalizedNewsRequest):
    try:
        return await news_service.get_personalized_news(data.role, data.domain)
    except Exception as e:
        return []
