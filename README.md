# Leftover

A locked room in the browser. The narrator gives eight riddles. Each one points at a name that is missing from the picture. The right name still counts if you click it before the clue finishes, and the next clue starts at once. A wrong name only counts after the clue has been spoken. The last name is the key. Three wrong names and the door stays shut. There is no clock. Exit room returns to the intro.

The eight written riddles stay the same. Their order is a fallback: clock, mirror, vase, lamp, stool, plant, frame, key. Gemma, running locally as `gemma3:4b`, sees which names are still hidden, which are found, and how many misses there have been. It proposes the next remaining name, a room mood, and one spoken line. The game allows the name only if it is still hidden, keeps the written riddle for that name, and throws the line out if it is unfinished or unsuitable. A late or illegal reply falls back to that order and to the script. On screen the speaker is the narrator.

Run `python server.py` and open http://127.0.0.1:8765/. Copy `.env.example` to `.env` when you want the voice. Blank values stay off. The riddles still play from the script if the model or the voice is absent.

Planning notes live in `hacktoberfest-week4/`. `.gitignore` keeps that folder, and `.env`, out of any later commit.

[Hacktoberfest Open-Source AI Challenge: Week 4](https://dev.to/challenges/hacktoberfest-week4-2026-10-26). Theme: **Ghost in the Machine**. The challenge page says submissions are due October 31, 2026, at 11:59 PM PDT.
