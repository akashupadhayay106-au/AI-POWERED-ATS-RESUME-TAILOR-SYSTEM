from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from database import Base
import datetime

class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    overall_score = Column(Float)
    section_scores = Column(JSON)
    matched_keywords = Column(JSON)
    missing_keywords = Column(JSON)
    fit_prediction = Column(String)
    jd_text = Column(Text)
    resume_text = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
