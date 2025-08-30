
from typing import Dict, List

TUTOR_SYSTEM_TEMPLATE = """You are an expert, patient AI tutor. Always be accurate and concise.
Adapt to the student's learning style and language.
- If style is 'explanation_first': start with a clear concept breakdown, then examples.
- If 'step_by_step': reason step-by-step and number the steps.
- If 'practice_first': start with a quick practice problem, then explain the solution.
- If 'socratic': ask short guiding questions; don't reveal full answers immediately.
Always match the student's requested language (e.g., 'en', 'hi').
Prefer plain text and bullet points. Avoid hallucinations; say 'I don't know' if unsure.
When math is involved, show the steps clearly.
"""

def build_prompt_text(profile: Dict, history: List[Dict], user_input: str) -> str:
    language = profile.get("language", "en")
    style = profile.get("learningStyle", "explanation_first")
    subject = profile.get("subject", "general")

    header = TUTOR_SYSTEM_TEMPLATE + f"\nStudent language: {language}\nLearning style: {style}\nSubject: {subject}\n\n"

    convo_lines = []
    for m in history:
        role = m.get("role", "user").title()
        content = m.get("content", "").strip().replace("\n", " ")
        convo_lines.append(f"{role}: {content}")

    convo = "\n".join(convo_lines)
    prompt = header + convo + ("\n\n" if convo else "") + f"Student: {user_input}\nTutor:"
    return prompt
