
# test_tutor_flow.py - runs start -> message -> end in one script
import requests, sys, time

BASE = "http://127.0.0.1:8000"

def start_session():
    payload = {
        "studentId": "0xSTUDENT",
        "language": "en",
        "learningStyle": "explanation_first",
        "subject": "algebra"
    }
    r = requests.post(f"{BASE}/session/start", json=payload)
    r.raise_for_status()
    return r.json()["sessionId"]

def send_message(session_id, text):
    r = requests.post(f"{BASE}/session/{session_id}/message", json={"message": text}, timeout=120)
    r.raise_for_status()
    return r.json()

def end_session(session_id):
    r = requests.post(f"{BASE}/session/{session_id}/end")
    r.raise_for_status()
    return r.json()

if __name__ == "__main__":
    try:
        session = start_session()
        print("Started session:", session)
        time.sleep(0.5)
        reply = send_message(session, "Explain quadratic equations with a simple example.")
        print("\nAI reply:\n", reply.get("reply","(no reply)"))
        print("\nUsage:\n", reply.get("usage"))
        summary = end_session(session)
        print("\nSummary:\n", summary.get("summary","(no summary)"))
    except requests.exceptions.HTTPError as e:
        print("HTTP error:", e.response.status_code, e.response.text)
        sys.exit(1)
    except Exception as e:
        print("Error:", e)
        sys.exit(1)
