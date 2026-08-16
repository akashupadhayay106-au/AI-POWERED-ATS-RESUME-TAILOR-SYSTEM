from pydantic import BaseModel
from typing import List, Optional


class EducationItem(BaseModel):
    degree: str
    institution: str
    location: str
    dates: str
    gpa: Optional[str] = None


class ExperienceItem(BaseModel):
    title: str
    company: str
    location: str
    dates: str
    bullets: List[str]


class ProjectItem(BaseModel):
    name: str
    description: List[str]


class ResumeData(BaseModel):
    full_name: str
    email: str
    phone: str
    location: str
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: str
    skills_programming: str
    skills_data_analysis: str
    skills_tools: str
    education: List[EducationItem]
    experience: List[ExperienceItem]
    projects: List[ProjectItem]
    achievements: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    style_preset: Optional[str] = "modern"
