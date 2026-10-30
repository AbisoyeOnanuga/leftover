"""Serve Leftover and POST /act.

The browser never calls Ollama or ElevenLabs. A hide asks gemma3:4b for one
id from the list the page sent, plus one sentence. Other events ask for the
sentence only. The page does not send the leftover.
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
NAMES = (
    "Lamp", "Vase", "Chair", "Bed", "Door", "Plant", "Frame", "Clock",
    "Crate", "Stool", "Mirror", "Rug", "Shade", "Key", "Camera",
)
NAME_BY_ID = {name.lower(): name for name in NAMES}
SYSTEM = (
    "You are the agent of a scene file. Reply with one JSON object only. "
    "The line is one short sentence, spooky and taunting, about the file, the room, or a listed object. "
    "Do not address anyone. Do not say you, your, or breath. Do not say which object was kept. "
    "Do not name an object that is not in the list you are given."
)


def load_env():
    path = ROOT / ".env"
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def mentions(line):
    found = []
    for name in NAMES:
        if re.search(rf"\b{re.escape(name)}\b", line, re.I):
            found.append(name)
    return found


def line_ok(line, allowed_names):
    if not isinstance(line, str):
        return False
    text = " ".join(line.split())
    if not text or len(text) > 180:
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
    if not text.startswith("I "):
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


def gemma(user):
    url = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/") + "/api/chat"
    body = {
        "model": os.environ.get("OLLAMA_MODEL", "gemma3:4b"),
        "stream": False,
        "format": "json",
        "keep_alive": "30m",
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ],
        "options": {"temperature": 0.7, "num_predict": 48},
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


def prompt_for(event, names, allowed_ids):
    listed = ", ".join(names) if names else "none"
    if event == "hide":
        order = list(allowed_ids)
        random.shuffle(order)
        return (
            f"Ids: {', '.join(order)}. Choose one id. "
            "line must start with I closed the, then that object's name. "
            "Then say the file moved or the room went dim. "
            "Do not use remembers, every, whispered, scream, regret, echo, or darkness. "
            "Do not say you, your, breath, or kept. JSON keys are id and line."
        )
    cues = {
        "open": "The file just opened on a new room. Do not name an object.",
        "taunt": "You closed an eye. The sentence may name only the object in the list.",
        "wrong": "They clicked a name that was already drawn. You may name only the objects in the list.",
        "reopen": "They opened an eye you had closed. You may name only that object.",
        "playerHide": "They hid something themselves. You may name only that object.",
        "hold": "They shut an eye on a name you are holding out. Do not name it. Do not say it is the one you kept.",
        "found": "They found the object and it is now in the view. You may name it. One grudging sentence.",
        "timeout": "Their time ran out and the missing object is now in the view. You may name it.",
        "close": "You are closing the file. Do not name an object.",
        "shade": "They finished the file and you are showing the shade. You may name the Shade.",
    }
    cue = cues.get(event)
    if not cue:
        return None
    return (
        f"{cue} line must start with I. One short taunt about the file. "
        "Do not use remembers, every, whispered, scream, regret, echo, or darkness. "
        "Do not say you, your, breath, or kept. "
        f"You may name only: {listed}. JSON key is line."
    )


def act(body):
    event = body.get("event")
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
    user = prompt_for(event, names, allowed_ids)
    if not user or (event == "hide" and len(allowed_ids) < 3):
        return {"id": None, "line": None}
    started = time.perf_counter()
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
            elif not re.match(r"I closed the\b", line.strip(), re.I):
                line = None
            elif not re.search(rf"\b{re.escape(NAME_BY_ID[picked])}\b", line, re.I):
                line = None
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


def speak_mp3(text):
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key or not isinstance(text, str):
        return None
    text = " ".join(text.split())
    if not text or len(text) > 180:
        return None
    voice = os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb").strip()
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"
    body = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {"stability": 0.35, "similarity_boost": 0.75},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "xi-api-key": key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read()


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
            try:
                audio = speak_mp3(text)
            except (urllib.error.URLError, TimeoutError, OSError):
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
