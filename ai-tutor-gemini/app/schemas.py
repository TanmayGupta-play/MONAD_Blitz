
from pydantic import BaseModel, Field
from typing import Dict, Any, Literal

LearningStyle = Literal["explanation_first", "step_by_step", "practice_first", "socratic"]

class StartSessionRequest(BaseModel):
    studentId: str
    language: str = Field(default="en", description="ISO code like 'en', 'hi'")
    learningStyle: LearningStyle = "explanation_first"
    subject: str = "general"

class StartSessionResponse(BaseModel):
    sessionId: str
    message: str = "session created"

class MessageRequest(BaseModel):
    message: str

class MessageResponse(BaseModel):
    sessionId: str
    reply: str
    usage: Dict[str, Any] = {}

class EndSessionResponse(BaseModel):
    sessionId: str
    summary: str
    turns: int
    metrics: Dict[str, Any] = {}
