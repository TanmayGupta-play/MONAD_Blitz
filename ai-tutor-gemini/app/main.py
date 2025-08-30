
import os, uuid, hmac, hashlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from dotenv import load_dotenv

from .schemas import StartSessionRequest, StartSessionResponse, MessageRequest, MessageResponse, EndSessionResponse
from .memory import SessionStore
from .prompts import build_prompt_text
from .llm import load_provider

load_dotenv()

app = FastAPI(title='AI Tutor Engine (Gemini)')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

store = SessionStore(redis_url=os.getenv('REDIS_URL') or None)
provider = load_provider()

class Health(BaseModel):
    ok: bool

@app.get('/health', response_model=Health)
def health():
    return {'ok': True}

@app.post('/session/start', response_model=StartSessionResponse)
def start_session(req: StartSessionRequest):
    session_id = str(uuid.uuid4())
    profile = req.model_dump()
    store.create(session_id, profile)
    store.append_message(session_id, 'system', 'AI Tutor session started.')
    return StartSessionResponse(sessionId=session_id, message='session created')

@app.post('/session/{session_id}/message', response_model=MessageResponse)
def send_message(session_id: str, req: MessageRequest):
    try:
        data = store.fetch(session_id)
    except KeyError:
        raise HTTPException(404, 'session not found')

    prompt = build_prompt_text(data['profile'], data['messages'], req.message)
    messages_for_provider = [{'role': 'system', 'content': prompt}]
    try:
        reply, usage = provider.generate(messages_for_provider)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    store.append_message(session_id, 'user', req.message)
    store.append_message(session_id, 'assistant', reply)

    return MessageResponse(sessionId=session_id, reply=reply, usage=usage)

@app.post('/session/{session_id}/end', response_model=EndSessionResponse)
def end_session(session_id: str):
    try:
        data = store.end(session_id)
    except KeyError:
        raise HTTPException(404, 'session not found')

    turns = max(0, (len(data['messages']) - 1) // 2)
    summary_prompt = 'Summarize this tutoring session in 4-6 bullet points focusing on concepts learned and next steps.'
    conv_text = '\n'.join([f"{m.get('role','User').title()}: {m.get('content','')}" for m in data['messages']])
    prompt = summary_prompt + '\n\nConversation:\n' + conv_text

    try:
        summary, usage = provider.generate([{'role': 'system', 'content': prompt}])
    except Exception:
        summary = 'Unable to generate summary.'
        usage = {}

    payload = {
        'sessionId': session_id,
        'summary': summary,
        'turns': turns,
        'metrics': {
            'estimated_time_minutes': max(1, turns * 2),
        }
    }

    cb_url = os.getenv('ORACLE_CALLBACK_URL')
    if cb_url:
        secret = os.getenv('SIGNING_SECRET', '')
        body = str(payload).encode('utf-8')
        sig = hmac.new(secret.encode('utf-8'), body, hashlib.sha256).hexdigest() if secret else ''
        try:
            import httpx
            with httpx.Client(timeout=10) as client:
                client.post(cb_url, json=payload, headers={'X-Signature': sig})
        except Exception:
            pass

    return EndSessionResponse(**payload)
