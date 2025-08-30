
import os, time, json
from typing import Dict, Any, Optional

try:
    import redis
except Exception:
    redis = None

class SessionStore:
    def __init__(self, redis_url: Optional[str] = None, ttl_seconds: int = 60*60*6):
        self.ttl = ttl_seconds
        self.use_redis = bool(redis_url and redis)
        if self.use_redis and redis:
            self.r = redis.Redis.from_url(redis_url, decode_responses=True)
        else:
            self.r = None
            self._mem: Dict[str, Dict[str, Any]] = {}

    def create(self, session_id: str, profile: Dict[str, Any]):
        data = {
            "profile": profile,
            "created_at": time.time(),
            "messages": []  # list of {role, content}
        }
        self._set(session_id, data)

    def append_message(self, session_id: str, role: str, content: str):
        data = self._get(session_id)
        if not data:
            raise KeyError("Session not found")
        data["messages"].append({"role": role, "content": content})
        # truncate context
        if len(data["messages"]) > 40:
            head = data["messages"][:1]
            tail = data["messages"][-30:]
            data["messages"] = head + tail
        self._set(session_id, data)

    def fetch(self, session_id: str):
        data = self._get(session_id)
        if not data:
            raise KeyError("Session not found")
        return data

    def end(self, session_id: str):
        data = self._get(session_id)
        if not data:
            raise KeyError("Session not found")
        return data

    def _get(self, key: str):
        if self.use_redis and self.r:
            raw = self.r.get(key)
            return json.loads(raw) if raw else None
        return self._mem.get(key)

    def _set(self, key: str, value: Dict[str, Any]):
        if self.use_redis and self.r:
            self.r.setex(key, self.ttl, json.dumps(value))
        else:
            self._mem[key] = value
