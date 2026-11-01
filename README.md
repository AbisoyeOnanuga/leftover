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

Use a Render **Web Service**, not a static site. The service runs `python server.py`.

| Field | Value |
| --- | --- |
| Runtime | Python |
| Build command | `pip install -r requirements.txt` |
| Start command | `python server.py` |

Environment variables on that service, not in the repo:

| Key | Value |
| --- | --- |
| `HOST` | `0.0.0.0` |
| `ELEVENLABS_API_KEY` | The secret shown when the key was created |
| `ELEVENLABS_VOICE_ID` | The voice id from the same account |
| `DO_INFERENCE_KEY` | The Gradient model access key |
| `DO_MODEL` | `gemma-4-31B-it` |

Leave `PORT` unset. Render sets it. Leave `OLLAMA_URL` unset on Render. There is no Ollama on that machine, so a failed DigitalOcean call uses the written order.

The free ElevenLabs plan includes 10,000 credits a month. Flash, the model this game uses, is discounted to between half a credit and one credit per character, so the month covers at least 10,000 characters. One full game is about 2,000 characters. If the account runs out, the lines stay on screen and the intro says the voice account is out of characters.

## Gemma on DigitalOcean

Gradient is DigitalOcean's model platform. Serverless inference calls Gemma without a GPU droplet. The model id is `gemma-4-31B-it`. Keeping that id, or the local `gemma3:4b`, is what keeps the project a Gemma project.

1. Sign in at [cloud.digitalocean.com](https://cloud.digitalocean.com).
2. Open **Gradient**, then **Serverless inference**, then **Model access keys**. The direct page is [Manage model access keys](https://docs.digitalocean.com/products/inference/how-to/manage-model-access-keys/).
3. Choose **Create model access key**. Name it `leftover`.
4. On **Foundation models**, choose **Select models** and pick **Gemma 4** (`gemma-4-31B-it`). Leave the other models off.
5. Leave the VPC empty so Render can reach the public endpoint `https://inference.do-ai.run`.
6. Create the key and copy the secret once. It is shown only then.
7. Paste that secret as `DO_INFERENCE_KEY` on the Render service. Set `DO_MODEL` to `gemma-4-31B-it`.

This key is a model access key. It is not the account API token from Settings. The catalog lists models an account cannot call, so a valid key can still be refused for Gemma. When that happens the written order plays and the intro says so.

The site stays on Render. DigitalOcean is only the model call. One app host is enough. Do not create a GPU droplet.

Planning notes live in `hacktoberfest-week4/`. `.gitignore` keeps that folder, and `.env`, out of any later commit.
