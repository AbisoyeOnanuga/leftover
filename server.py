"""Serve Leftover and POST /act.

The browser never calls a model or a voice service. A hide asks the model for
one id from the list the page sent, plus one sentence. Other events ask for
the sentence only. The page does not send the leftover.

Optional tools are environment values. A blank value skips that tool, so
another one is a blank key in .env.example and a check beside these.
"""

import json
import os
import random
import re
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOG = ROOT / "hacktoberfest-week4" / "act-log.jsonl"
CHAIN_IDS = ("clock", "mirror", "vase", "lamp", "stool", "plant", "frame", "key")
MOODS = ("still", "dim", "warm", "web")
STEER_SYSTEM = (
    "You choose the next move in a locked room for a child. Reply with one JSON object only. "
    "Keys are id, mood, and line. id is one of the remaining ids. "
    "mood is still, dim, warm, or web. "
    "line is one complete spoken sentence that starts with I and names no object. "
    "No flirting, romance, or bodies."
)
NAMES = (
    "Lamp", "Vase", "Chair", "Bed", "Door", "Plant", "Frame", "Clock",
    "Crate", "Stool", "Mirror", "Rug", "Shade", "Key", "Camera",
)
NAME_BY_ID = {name.lower(): name for name in NAMES}
SYSTEM = (
    "You are the narrator of a locked room, speaking aloud. Reply with one JSON object only. "
    "The line is one or two complete spoken sentences, not a fragment. "
    "Keep it under forty words. Spooky, and trying to keep the door shut. "
    "The listener may be young. No flirting, romance, bodies, or invitations to stay. "
    "Do not address anyone. Do not say you, your, or breath. "
    "Do not name an object. Do not give the answer to the riddle."
)
VOICE = {"error": ""}


def load_env():
    path = ROOT / ".env"
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        val = value.strip().strip('"').strip("'")
        name = key.strip()
        if val:
            os.environ[name] = val
        else:
            os.environ.setdefault(name, "")


def mentions(line):
    found = []
    for name in NAMES:
        if re.search(rf"\b{re.escape(name)}\b", line, re.I):
            found.append(name)
    return found


def too_personal(text):
    return re.search(
        r"\b(kiss|kisses|lips|skin|undress|naked|sexy|seduc\w*|darling|sweetheart|babe|lonely|desire|flirt|romantic|bedroom|cuddle|moan|thigh|breast|belly|neck|linger)\b|all night|stay a while|come closer|come here|want you|hold you|touch you|my dear",
        text,
        re.I,
    )


def line_ok(line, allowed_names):
    if not isinstance(line, str):
        return False
    text = " ".join(line.split())
    if not text or len(text) > 240:
        return False
    if len(re.findall(r"[.!?]", text)) > 2:
        return False
    allowed = {name.lower() for name in allowed_names}
    named = mentions(text)
    if any(name.lower() not in allowed for name in named):
        return False
    if re.search(r"\bkept\b", text, re.I) and named:
        return False
    if re.search(r"\b(you|your|yourself|breath|remembers|every|whispered|scream|regret|echo|darkness)\b", text, re.I):
        return False
    if too_personal(text):
        return False
    if not text.startswith("I "):
        return False
    if not re.search(r"[.!?]$", text):
        return False
    if re.search(r"\b(I am|I'm)\s*[.!?]*$", text, re.I):
        return False
    return True


def parse_json(raw):
    if not isinstance(raw, str):
        return None
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.S)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


def env_value(name):
    return os.environ.get(name, "").strip()


VARY_SYSTEM = (
    "You paraphrase a narrator who is keeping someone in a locked room. "
    "Reply with one JSON object only. Keep the clue solvable and the same meaning. "
    "Sound like a person talking, a little eerie, and suitable for a child. "
    "No flirting, romance, bodies, or invitations to stay. "
    "One or two sentences, under forty words. "
    "Do not name any forbidden object. Do not mention any object the original line does not already name. "
    "JSON key is line."
)


def variation_ok(line, forbidden, source):
    if not isinstance(line, str):
        return False
    text = " ".join(line.split())
    if len(text) < 12 or len(text) > 240:
        return False
    if len(re.findall(r"[.!?]+", text)) > 2:
        return False
    if not re.search(r"[.!?]$", text):
        return False
    blocked = {name.lower() for name in forbidden}
    for name in mentions(text):
        if name.lower() in blocked:
            return False
        if not re.search(rf"\b{re.escape(name)}\b", source, re.I):
            return False
    if too_personal(text):
        return False
    return True


def gemma(user, system=None, temperature=0.7):
    # Blank OLLAMA_URL means the public local Ollama port, not an account host.
    url = (env_value("OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/") + "/api/chat"
    body = {
        "model": os.environ.get("OLLAMA_MODEL", "gemma3:4b"),
        "stream": False,
        "format": "json",
        "keep_alive": "30m",
        "messages": [
            {"role": "system", "content": system or SYSTEM},
            {"role": "user", "content": user},
        ],
        "options": {"temperature": temperature, "num_predict": 90},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=12) as response:
        payload = json.loads(response.read().decode("utf-8"))
    content = payload.get("message", {}).get("content", "")
    return parse_json(content), content


def prompt_for(event, names, allowed_ids, source=""):
    listed = ", ".join(names) if names else "none"
    if event == "vary":
        text = " ".join(source.split())
        if not text or len(text) > 400:
            return None
        banned = ", ".join(names) if names else "none"
        return (
            f"Forbidden names: {banned}. "
            "Rewrite the line in fresh spoken words. Same clue, same meaning, not harder. "
            "Do not add an object the line does not already name. "
            f"Line: {text} JSON key is line."
        )
    if event == "hide":
        order = list(allowed_ids)
        random.shuffle(order)
        return (
            f"Ids: {', '.join(order)}. Choose one id. "
            "Write one or two complete sentences that name that object and say the eye is closed. "
            "Do not use remembers, every, whispered, scream, regret, echo, or darkness. "
            "Do not say you, your, breath, or kept. JSON keys are id and line."
        )
    cues = {
        "wrong": "They chose the wrong name. Taunt them for one or two sentences, the way you would tease a child about a puzzle. No flirting. Do not name any object. Do not reveal the answer.",
        "aside": "A riddle is already on screen. Add one spooky sentence about the locked door, suitable for a child. No flirting, no bodies, no invitation to stay. Do not name any object. Do not reveal the answer.",
        "open": "The room has just been entered. One spooky sentence about the locked door. Do not name any object.",
        "close": "They failed and the door stayed shut. One sentence. Do not name any object.",
    }
    cue = cues.get(event)
    if not cue:
        return None
    return (
        f"{cue} Write one or two complete spoken sentences that start with I. "
        "Do not use remembers, every, whispered, scream, regret, echo, or darkness. "
        "Do not say you, your, breath, or kept. "
        f"You may name only: {listed}. JSON key is line."
    )


def steer_turn(body):
    remaining = []
    for value in body.get("remaining") or []:
        if isinstance(value, str) and value in CHAIN_IDS and value not in remaining:
            remaining.append(value)
    if not remaining:
        return {"id": None, "mood": None, "line": None}
    phase = body.get("phase") if body.get("phase") in ("open", "next", "wrong") else "next"
    found = []
    for value in body.get("found") or []:
        if isinstance(value, str) and value in CHAIN_IDS and value not in found:
            found.append(value)
    misses = body.get("misses") if isinstance(body.get("misses"), int) else 0
    if phase == "wrong":
        instruction = f"The player missed. Keep id as {remaining[0]}."
    else:
        instruction = "Choose the next id from the remaining list. The first id is only the fallback."
    user = (
        f"Remaining: {', '.join(remaining)}. Found: {', '.join(found) or 'none'}. Misses: {misses}. "
        f"{instruction} Mood is still, dim, warm, or web. "
        "The line names no object. JSON keys are id, mood, and line."
    )
    started = time.perf_counter()
    parsed, raw = gemma(user, STEER_SYSTEM, 0.4)
    elapsed = round((time.perf_counter() - started) * 1000)
    parsed = parsed if isinstance(parsed, dict) else {}
    candidate = parsed.get("id")
    if isinstance(candidate, str):
        candidate = candidate.strip().lower()
    picked = remaining[0] if phase == "wrong" else candidate if candidate in remaining else None
    mood = parsed.get("mood")
    if isinstance(mood, str):
        mood = mood.strip().lower()
    if mood not in MOODS:
        mood = None
    line = parsed.get("line")
    accepted = line if line_ok(line, []) else None
    write_log({
        "event": "steer",
        "phase": phase,
        "remaining": remaining,
        "reply": raw if isinstance(raw, str) else "",
        "id": picked,
        "mood": mood,
        "line": accepted,
        "ms": elapsed,
    })
    return {"id": picked, "mood": mood, "line": accepted, "ms": elapsed}


def act(body):
    event = body.get("event")
    if event == "steer":
        return steer_turn(body)
    raw_names = body.get("names") if isinstance(body.get("names"), list) else []
    names = []
    for item in raw_names:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if isinstance(name, str) and name in NAMES and name not in names:
            names.append(name)
    allowed_ids = []
    if event == "hide":
        for value in body.get("allowedIds") or []:
            if isinstance(value, str) and value in NAME_BY_ID and value not in allowed_ids:
                allowed_ids.append(value)
        names = [NAME_BY_ID[value] for value in allowed_ids]
    source = body.get("source") if isinstance(body.get("source"), str) else ""
    user = prompt_for(event, names, allowed_ids, source)
    if not user or (event == "hide" and len(allowed_ids) < 3):
        return {"id": None, "line": None}
    started = time.perf_counter()
    if event == "vary":
        parsed, raw = gemma(user, VARY_SYSTEM, 0.95)
    else:
        parsed, raw = gemma(user)
    elapsed = round((time.perf_counter() - started) * 1000)
    parsed = parsed if isinstance(parsed, dict) else {}
    line = parsed.get("line")
    picked = None
    if event == "hide":
        candidate = parsed.get("id")
        if isinstance(candidate, str):
            candidate = candidate.strip().lower()
        if candidate in allowed_ids:
            picked = candidate
        if isinstance(line, str) and picked:
            named = mentions(line)
            if any(name.lower() != picked for name in named):
                line = None
            elif not re.search(rf"\b{re.escape(NAME_BY_ID[picked])}\b", line, re.I):
                line = None
    if event == "vary":
        accepted = line if variation_ok(line, names, source) else None
    else:
        accepted = line if line_ok(line, names) else None
    if isinstance(accepted, str):
        for name in names:
            accepted = re.sub(rf"\b{re.escape(name)}\b", name, accepted, flags=re.I)
    write_log({
        "event": event,
        "allowedIds": allowed_ids,
        "names": names,
        "reply": raw if isinstance(raw, str) else "",
        "id": picked,
        "line": accepted,
        "ms": elapsed,
    })
    return {"id": picked, "line": accepted, "ms": elapsed}


def write_log(entry):
    entry["at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + "\n")


def clip_context(value):
    if not isinstance(value, str):
        return ""
    text = " ".join(value.split())
    return text[:180]


def speak_mp3(text, previous="", following=""):
    key = env_value("ELEVENLABS_API_KEY")
    voice = env_value("ELEVENLABS_VOICE_ID")
    if not key or not voice or not isinstance(text, str):
        return None
    text = " ".join(text.split())
    if not text or len(text) > 280:
        return None
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"
    body = {
        "text": text,
        "model_id": "eleven_flash_v2_5",
        "voice_settings": {
            "stability": 0.86,
            "similarity_boost": 0.8,
            "style": 0,
            "speed": 0.9,
        },
    }
    before = clip_context(previous)
    after = clip_context(following)
    if before:
        body["previous_text"] = before
    if after:
        body["next_text"] = after
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "xi-api-key": key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            VOICE["error"] = ""
            return response.read()
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace")
        if "api_key_id_used_as_api_key" in detail:
            VOICE["error"] = "key-id"
        else:
            VOICE["error"] = str(err.code)
        write_log({"event": "speak", "status": err.code, "chars": len(text)})
        return None


def warmup():
    try:
        gemma("Reply with {\"line\":\"I kept one object.\"}")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        pass


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("", "/"):
            path = "/index.html"
        if path == "/voice":
            payload = {
                "ready": bool(env_value("ELEVENLABS_API_KEY") and env_value("ELEVENLABS_VOICE_ID")),
                "error": VOICE.get("error") or "",
            }
            data = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)
            return
        candidate = (ROOT / path.lstrip("/")).resolve()
        if candidate.parent != ROOT or candidate.suffix.lower() not in {".html", ".js", ".css"} or not candidate.is_file():
            self.send_error(404)
            return
        kind = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8"}
        data = candidate.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", kind[candidate.suffix.lower()])
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0 or length > 8000:
            self.send_error(400)
            return
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(400)
            return
        if path == "/act":
            try:
                payload = act(body if isinstance(body, dict) else {})
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
                payload = {"id": None, "line": None}
            data = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if path == "/speak":
            text = body.get("text") if isinstance(body, dict) else ""
            previous = body.get("previous") if isinstance(body, dict) else ""
            following = body.get("next") if isinstance(body, dict) else ""
            try:
                audio = speak_mp3(text, previous, following)
            except (urllib.error.URLError, TimeoutError, OSError):
                VOICE["error"] = "network"
                audio = None
            if not audio:
                self.send_response(204)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(audio)))
            self.end_headers()
            self.wfile.write(audio)
            return
        self.send_error(404)

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} {fmt % args}", flush=True)


def main():
    load_env()
    threading.Thread(target=warmup, daemon=True).start()
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("Leftover is at http://127.0.0.1:8765/", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
