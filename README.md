# Leftover

A locked room in the browser. The narrator gives eight riddles. Each one points at a name that is missing from the picture. Click that name in the outliner and the object appears. The last name is the key. Three wrong names and the door stays shut. There is no clock.

The eight objects stay in the same order on every play. That order is the story. Gemma, running locally as `gemma3:4b`, may paraphrase a line. It does not choose the object, the order, or the ending. The game asks for one sentence, then keeps it or throws it out. That is a model. It is not an agent: there is no loop where the model picks a tool, sees the result, and tries again. On screen the speaker is the narrator.

Run `python server.py` and open http://127.0.0.1:8765/. Copy `.env.example` to `.env` when you want the voice. Blank values stay off. The riddles still play from the script if the model or the voice is absent.

Planning notes live in `hacktoberfest-week4/`. `.gitignore` keeps that folder, and `.env`, out of any later commit.

[Hacktoberfest Open-Source AI Challenge: Week 4](https://dev.to/challenges/hacktoberfest-week4-2026-10-26). Theme: **Ghost in the Machine**. The challenge page says submissions are due October 31, 2026, at 11:59 PM PDT.
