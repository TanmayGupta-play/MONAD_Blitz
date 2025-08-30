
import os, requests, json, time
from typing import List, Dict, Any, Tuple

class LLMProvider:
    def generate(self, messages: List[Dict[str, str]]) -> Tuple[str, Dict[str, Any]]:
        raise NotImplementedError

class DummyProvider(LLMProvider):
    def generate(self, messages: List[Dict[str, str]]):
        last_user = next((m['content'] for m in reversed(messages) if m['role']=='user'), '')
        reply = f"(dummy tutor) You asked: '{last_user}'. Here's a brief explanation and example."
        usage = {"provider": "dummy", "prompt_tokens": 0, "completion_tokens": 0}
        return reply, usage

class GeminiProvider(LLMProvider):
    def __init__(self):
        self.token = os.getenv('GEMINI_API_KEY')
        if not self.token:
            raise RuntimeError('GEMINI_API_KEY missing in environment')
        self.model = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        self.api_url = f'https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent'
        self.headers = {'Content-Type': 'application/json', 'x-goog-api-key': self.token}

    def _serialize_prompt(self, messages: List[Dict[str, str]]) -> str:
        return '\n'.join([f"{m.get('role','User').title()}: {m.get('content','')}" for m in messages])

    def generate(self, messages: List[Dict[str, str]]):
        prompt_text = self._serialize_prompt(messages)
        payload = {
            "contents": [
                {"parts": [{"text": prompt_text}]}
            ],
            "generationConfig": {"maxOutputTokens": 512, "temperature": 0.2}
        }
        start = time.time()
        resp = requests.post(self.api_url, headers=self.headers, json=payload, timeout=60)
        duration = time.time() - start
        if resp.status_code != 200:
            try:
                err = resp.json()
            except Exception:
                err = resp.text
            raise RuntimeError(f"Gemini API error: {resp.status_code} \n{err}")
        data = resp.json()
        text = ""
        try:
            text = data['candidates'][0]['content']['parts'][0]['text']
        except Exception:
            text = json.dumps(data)
        usage = {
            'provider': 'gemini',
            'model': self.model,
            'status_code': resp.status_code,
            'duration_s': round(duration, 3)
        }
        return text, usage

def load_provider() -> LLMProvider:
    provider = (os.getenv('LLM_PROVIDER') or 'gemini').lower()
    if provider == 'dummy':
        return DummyProvider()
    if provider in ('gemini','google','google-genai'):
        return GeminiProvider()
    raise ValueError(f'Unsupported LLM_PROVIDER: {provider}')
