# Leftover

A locked room in the browser. The narrator gives eight riddles. Each one points at a name that is missing from the picture. The right name still counts if you click it before the clue finishes, and the next clue starts at once. A wrong name only counts after the clue has been spoken. The last name is the key. Three wrong names and the door stays shut. There is no clock. Exit room returns to the intro.

The eight written riddles stay the same. Their order is a fallback: clock, mirror, vase, lamp, stool, plant, frame, key. Gemma sees which names are still hidden, which are found, and how many misses there have been. It proposes the next remaining name and a room mood. The game allows the name only if it is still hidden, keeps the written riddle for that name, and drops a line that is unfinished or unsuitable. A late or illegal reply, or no model at all, uses that order and the script. On screen the speaker is the narrator.

[Hacktoberfest Open-Source AI Challenge: Week 4](https://dev.to/challenges/hacktoberfest-week4-2026-10-26). Theme: **Ghost in the Machine**.

## Play on this machine

One script installs Ollama if it is missing and pulls `gemma3:4b`.

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Then, if you want speech, open `.env` and paste two values from your own ElevenLabs account:

```
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

The key is the secret shown when the key was created, not the key id in the account list. Leave both blank to keep every line on screen.

Start the game and open it:

```
python server.py
```

http://127.0.0.1:8765/

A `.env` copied from someone else works the same way. The server reads whatever is in that file. It does not need their machine. If their voice key is rejected, or their model is not running here, the intro says which part is missing and the written riddles still play.

## When voice or Gemma is missing

The room does not wait on either one.

- No ElevenLabs key, or the key is rejected: the narrator's lines stay on screen. Settings says voice is off.
- Ollama is not running, or `gemma3:4b` is not pulled: the written order plays. Settings says Gemma is not running.
- A hosted Gemma key is set and that call fails: the server tries Ollama on this machine, then the written order.
- The page is opened without this server, as plain files: the same written riddles play, and the intro says there is no voice server.

The model name has to be a Gemma model. `OLLAMA_MODEL` defaults to `gemma3:4b`. A name from another family is ignored.

## The public page

A Render **static site** only publishes the files. It does not run `server.py`, so it has no voice and no Gemma. The written riddles still play.

For that static site:

| Field | Value |
| --- | --- |
| Build command | Leave empty. There is no build. |
| Publish directory | `.` |
| Environment variables | None. A key in a static site would be copied into the public files. |

Voice and a hosted model need a **Web Service** later, not this static site. Start command `python server.py`, with `HOST` set to `0.0.0.0`. Render sets `PORT`. Put `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and `DO_INFERENCE_KEY` in that service's environment, not in the repo. Anyone who can open the site can ask it to speak, so that spends the voice account.

## Gemma on DigitalOcean

Serverless inference can serve Gemma without a GPU droplet. The model id for that call is `gemma-4-31B-it`. Keeping that id, or the local `gemma3:4b`, is what keeps the project a Gemma project. Pointing the same key at another model on that catalog drops the Gemma entry.

Create a model access key in Gradient and paste it as `DO_INFERENCE_KEY`. Leave it blank to stay on Ollama. The catalog lists models an account cannot call, so a key can be valid and still be refused for Gemma. When that happens the written order plays and the intro says so.

The site can stay on Render. DigitalOcean is only the model call. One app host is enough.

Planning notes live in `hacktoberfest-week4/`. `.gitignore` keeps that folder, and `.env`, out of any later commit.
