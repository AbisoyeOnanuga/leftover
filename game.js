const MISSES = 3;
const PENALTY = 25;
const FIND_POINTS = 100;
const CLEAR_BONUS = 200;
const BEST_KEY = "leftover-best";
const CLEARS_KEY = "leftover-clears";
const FURNITURE = ["door", "chair", "rug", "crate", "bed"];
const CHAIN = [
  {
    id: "clock",
    riddle: "There's a round blank on the wall. Not a window. It ought to have hands, and it ought to be counting. I left it out.",
    found: "There it is. The clock. It ticks, and it doesn't care that you're stuck. Door's still shut."
  },
  {
    id: "mirror",
    riddle: "Now and then I think someone's standing behind me. There isn't. What's missing is the thing that would throw that face back into the room.",
    found: "Mirror's up. Don't linger in it. The way out isn't on the other side."
  },
  {
    id: "vase",
    riddle: "Something should be sitting there with a neck and a belly, ready for water or stems. It doesn't walk. I never drew it.",
    found: "The vase. Empty, and not the way out."
  },
  {
    id: "lamp",
    riddle: "I like the corners dark, so I took the warm light off the floor. It's still only a name on the list.",
    found: "Fine. Have the lamp. It's warmer. You're not out."
  },
  {
    id: "stool",
    riddle: "There's already a place to sit. What's missing is the lower one, the one without a back. That name isn't in the picture.",
    found: "The stool. Lower than the chair. Door's still shut."
  },
  {
    id: "plant",
    riddle: "The corner used to be alive. Leaves, in a pot. Not something that walks. I never drew it.",
    found: "The plant. It'll still be here after you."
  },
  {
    id: "frame",
    riddle: "The wall should be holding a rectangle with a picture in it. The rectangle never got drawn.",
    found: "The frame. Nothing in it opens the door. One name left."
  },
  {
    id: "key",
    riddle: "Almost. What's left is small, it turns, and the door will not budge until you choose that name.",
    found: ""
  }
];
const TAUNTS = [
  "No. That one's already in the room.",
  "Wrong. I'm not in a rush.",
  "Listen again. That isn't it."
];
const ASIDES = [
  "Take your time. I'm not going anywhere.",
  "The door isn't impressed. Stay a while.",
  "Keep looking. I can wait all night."
];
const WIN_LINE = "You got out. I didn't want to say congratulations, but here it is. The door's open.";
const FAIL_LINE = "Three wrong. That's the end of it. The door stays shut.";

const KIT = [
  { id: "lamp", name: "Lamp", kind: "light", action: "The lamp was already lit in the file.", svg: lamp },
  { id: "vase", name: "Vase", kind: "mesh", action: "The vase settles into the empty spot.", svg: vase },
  { id: "chair", name: "Chair", kind: "mesh", action: "The chair takes the place the view skipped.", svg: chair },
  { id: "bed", name: "Bed", kind: "mesh", action: "The bed was in the file, and now it is in the picture.", svg: bed },
  { id: "door", name: "Door", kind: "mesh", action: "The door opens on a wall the view left blank.", svg: door },
  { id: "plant", name: "Plant", kind: "mesh", action: "The plant was parented here and never shown.", svg: plant },
  { id: "frame", name: "Frame", kind: "mesh", action: "The frame hangs where the wall was empty.", svg: frame },
  { id: "clock", name: "Clock", kind: "mesh", action: "The clock is a minute behind the view.", svg: clock },
  { id: "crate", name: "Crate", kind: "mesh", action: "The crate was sitting in the network.", svg: crate },
  { id: "stool", name: "Stool", kind: "mesh", action: "The stool rolls into the shot.", svg: stool },
  { id: "mirror", name: "Mirror", kind: "mesh", action: "The mirror shows a corner the view cut.", svg: mirror },
  { id: "rug", name: "Rug", kind: "mesh", action: "The rug unrolls under the room.", svg: rug }
];

const SHADE = {
  id: "shade",
  name: "Shade",
  kind: "light",
  action: "I never parented the shade. I kept it until you closed the file.",
  svg: shade
};

const roomEl = document.querySelector("#room");
const listEl = document.querySelector("#outliner");
const scoreEl = document.querySelector("#score");
const missesEl = document.querySelector("#misses");
const roomNoEl = document.querySelector("#room-no");
const timeEl = document.querySelector("#time");
const bestEl = document.querySelector("#best");
const noteEl = document.querySelector("#room-note");
const gainEl = document.querySelector("#gain");
const nextBtn = document.querySelector("#next");
const introEl = document.querySelector("#intro");
const introBest = document.querySelector("#intro-best");
const openBtn = document.querySelector("#open-file");
const endingEl = document.querySelector("#ending");
const endingTitle = document.querySelector("#ending-title");
const endingReward = document.querySelector("#ending-reward");
const endingCopy = document.querySelector("#ending-copy");
const endingScore = document.querySelector("#ending-score");
const againBtn = document.querySelector("#again");
const viewportEl = document.querySelector("#viewport");
const gimbalEl = document.querySelector("#gimbal");
const frameBtn = document.querySelector("#frame");
const settingsOpen = document.querySelector("#settings-open");
const settingsEl = document.querySelector("#settings");
const voiceBox = document.querySelector("#set-voice");
const soundBox = document.querySelector("#set-sound");
const musicBox = document.querySelector("#set-music");
const voiceLevel = document.querySelector("#voice-level");
const soundLevel = document.querySelector("#sound-level");
const voiceStatus = document.querySelector("#voice-status");
const introSpeechEl = document.querySelector("#intro-speech");
const INTRO_SPEECH = introSpeechEl ? introSpeechEl.textContent.trim() : "";
const VOICE_KEY = "leftover-voice";
const SOUND_KEY = "leftover-sound";
const MUSIC_KEY = "leftover-music";
const VOICE_LEVEL_KEY = "leftover-voice-level";
const SOUND_LEVEL_KEY = "leftover-sound-level";

let score = 0;
let streak = 0;
let misses = 0;
let foundRooms = 0;
let stepNo = 0;
let round = null;
let started = 0;
let timerId = 0;
let agentTimer = 0;
let runOver = false;
let beat = 0;
let voiceToken = 0;
let currentAudio = null;
let audioCtx = null;
let aimX = 0;
let aimY = 0;
let drag = null;
let keys = new Set();
let panClock = 0;
let voiceLive = false;
let pendingSay = null;
let speechQueue = [];
let speakingText = "";
let lastSpoken = "";
let varied = new Map();
let speechGap = null;
const SPEECH_GAP_MS = 420;
let scoreGraph = null;
let scoreTimer = 0;

const KIT_NAMES = KIT.map((item) => item.name).concat(["Shade", "Key", "Camera"]);

openBtn.addEventListener("click", () => begin());
againBtn.addEventListener("click", () => begin());
frameBtn.addEventListener("click", () => {
  openingShot();
  playCue("frame");
});
settingsOpen.addEventListener("click", () => {
  keys.clear();
  paintVoiceStatus();
  settingsEl.showModal();
});
voiceBox.checked = prefOn(VOICE_KEY);
soundBox.checked = prefOn(SOUND_KEY);
musicBox.checked = prefOn(MUSIC_KEY);
voiceLevel.value = String(Math.round(prefLevel(VOICE_LEVEL_KEY, 0.85) * 100));
soundLevel.value = String(Math.round(prefLevel(SOUND_LEVEL_KEY, 0.8) * 100));
voiceBox.addEventListener("change", () => {
  writePref(VOICE_KEY, voiceBox.checked);
  if (!voiceBox.checked && currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
});
soundBox.addEventListener("change", () => {
  writePref(SOUND_KEY, soundBox.checked);
  if (soundBox.checked) playCue("eye");
});
musicBox.addEventListener("change", () => {
  writePref(MUSIC_KEY, musicBox.checked);
  if (musicBox.checked) startScore();
  else stopScore();
});
voiceLevel.addEventListener("input", () => {
  writeLevel(VOICE_LEVEL_KEY, voiceLevel.value);
  if (currentAudio) currentAudio.volume = prefLevel(VOICE_LEVEL_KEY, 0.85);
});
soundLevel.addEventListener("input", () => writeLevel(SOUND_LEVEL_KEY, soundLevel.value));
soundLevel.addEventListener("change", () => playCue("eye"));
viewportEl.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  if (round && round.cameraHidden) return;
  playCue("look");
  drag = { x: event.clientX, y: event.clientY, ax: aimX, ay: aimY, id: event.pointerId };
  try {
    viewportEl.setPointerCapture(event.pointerId);
  } catch {
    /* The move still follows the pointer. */
  }
});
viewportEl.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  setAim(drag.ax - (event.clientX - drag.x), drag.ay - (event.clientY - drag.y));
});
viewportEl.addEventListener("pointerup", endDrag);
viewportEl.addEventListener("pointercancel", endDrag);
window.addEventListener("keydown", onLookKey);
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());
mountGimbal();
paintVoiceStatus();
nextBtn.addEventListener("click", onNext);
showIntro();

function showIntro() {
  const best = readNumber(BEST_KEY);
  introBest.hidden = best === 0;
  introBest.textContent = best ? `Best escape: ${best}.` : "";
  introEl.hidden = false;
  endingEl.hidden = true;
  clearTimeout(agentTimer);
  noteEl.textContent = "The door is locked.";
  drawBlank();
  drawTree([]);
  paintScore();
  openingShot();
}

function stopVoice() {
  pendingSay = null;
  speechQueue = [];
  speakingText = "";
  lastSpoken = "";
  voiceLive = false;
  clearTimeout(speechGap);
  speechGap = null;
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.pause();
    currentAudio = null;
  }
}

function begin() {
  stopVoice();
  stopScore();
  unlockAudio();
  if (prefOn(MUSIC_KEY)) startScore();
  score = 0;
  streak = 0;
  misses = 0;
  foundRooms = 0;
  stepNo = 0;
  runOver = false;
  introEl.hidden = true;
  endingEl.hidden = true;
  endingReward.hidden = true;
  endingReward.replaceChildren();
  const furniture = FURNITURE.map((id) => itemById(id));
  const placement = placeFurniture(furniture);
  const empty = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((cell) => !placement.has(cell));
  round = {
    placement,
    empty,
    solved: false,
    shifted: "",
    concealed: new Set(),
    locked: new Set(CHAIN.map((step) => step.id)),
    keyHidden: true,
    cameraHidden: false
  };
  gainEl.textContent = "";
  gainEl.classList.remove("down");
  nextBtn.hidden = true;
  timeEl.textContent = "—";
  paintScore();
  drawRoom();
  drawTree(shuffle([...furniture, ...CHAIN.map((step) => objectFor(step.id))]));
  paintEyes();
  placeCamera();
  varied = new Map();
  prefetch(0, "riddle");
  prefetch(0, "found");
  noteEl.textContent = CHAIN[0].riddle;
  enqueueSpeech(INTRO_SPEECH);
  enqueueSpeech(CHAIN[0].riddle);
  narrate(ASIDES[0], "aside");
}

function onNext() {}

function objectFor(id) {
  if (id === "key") return { id: "key", name: "Key", kind: "light", svg: keyShape };
  return itemById(id);
}

function placeFurniture(furniture) {
  const rug = furniture.find((item) => item.id === "rug");
  const others = furniture.filter((item) => item.id !== "rug");
  const rugCell = shuffle([8, 9, 10, 11])[0];
  const rest = shuffle([1, 2, 5, 6, 9, 10].filter((cell) => cell !== rugCell)).slice(0, others.length);
  const placement = new Map();
  if (rug) placement.set(rugCell, rug);
  others.forEach((item, index) => placement.set(rest[index], item));
  return placement;
}

function drawBlank() {
  roomEl.replaceChildren();
  for (let cell = 0; cell < 12; cell += 1) {
    const slot = document.createElement("div");
    slot.className = "cell";
    roomEl.append(slot);
  }
  paintCamera();
}

function drawRoom(extra) {
  roomEl.replaceChildren();
  for (let cell = 0; cell < 12; cell += 1) {
    const slot = document.createElement("div");
    slot.className = "cell";
    const item = round.placement.get(cell) || (extra && extra.cell === cell ? extra.item : null);
    const hidden = item && round.concealed.has(item.id);
    if (item && !hidden) slot.append(prop(item, extra && extra.item === item, round.shifted === item.id));
    roomEl.append(slot);
  }
  const sconce = document.createElement("div");
  sconce.className = "sconce";
  sconce.setAttribute("aria-hidden", "true");
  sconce.innerHTML = `<svg viewBox="0 0 64 72" aria-hidden="true"><rect x="28" y="0" width="8" height="10" fill="#8a5a3c"/><path d="M32 8c14 8 18 16 18 16" fill="none" stroke="#c9856a" stroke-width="4"/><path d="M10 24h44l8 22H2z" fill="#5c3a28"/><path class="shade" d="M14 26h36l6 16H8z" fill="#3a342c"/></svg>`;
  roomEl.append(sconce);
  paintCamera();
  const locked = Boolean(round.keyHidden);
  const lampLit = round.locked && !round.locked.has("lamp");
  roomEl.classList.toggle("key-off", false);
  roomEl.classList.toggle("lamp-lit", Boolean(lampLit));
  roomEl.classList.toggle("mood-late", locked && misses < 2 && !lampLit);
  roomEl.classList.toggle("mood-dark", locked && misses >= 2 && !lampLit);
}

function cameraMark() {
  const el = document.createElement("div");
  el.className = "rig-cam";
  el.innerHTML = svg(`<path d="M8 24h18l4-6h18a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#1c1814" stroke="#f7f1e6" stroke-width="2"/><circle cx="30" cy="34" r="7" fill="#243044" stroke="#e2a13a" stroke-width="2"/><circle cx="30" cy="34" r="3" fill="#9bb0c4"/><rect x="42" y="16" width="6" height="4" rx="1" fill="#e2a13a"/>`)();
  return el;
}

function drawTree(items) {
  listEl.replaceChildren();
  const scene = branch("Scene");
  scene.ul.append(rigRow("Camera", "camera", "camera"));
  scene.ul.append(rigRow("Narrator", "agent", ""));
  const room = branch("Room");
  items.forEach((item) => room.ul.append(objectRow(item)));
  scene.ul.append(room.li);
  listEl.append(scene.li);
}

function branch(name) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "branch";
  button.setAttribute("aria-expanded", "true");
  button.innerHTML = `<span class="twisty" aria-hidden="true"></span><span>${name}</span>`;
  const ul = document.createElement("ul");
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", open ? "true" : "false");
    ul.hidden = !open;
  });
  li.append(button, ul);
  return { li, ul };
}

function objectRow(item) {
  const li = document.createElement("li");
  li.className = "entry";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "object";
  button.dataset.id = item.id;
  button.innerHTML = rowMarkup(item.kind, item.name);
  button.addEventListener("click", () => choose(item, button));
  li.append(button, eyeButton(item.id));
  return li;
}

function rigRow(name, kind, eyeId) {
  const li = document.createElement("li");
  if (eyeId) li.className = "entry";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rig";
  button.innerHTML = rowMarkup(kind, name);
  button.addEventListener("click", () => {
    if (name !== "Narrator" || runOver || !round || round.solved || voiceLive) return;
    enqueueSpeech(clueLine(stepNo));
  });
  li.append(button);
  if (eyeId) li.append(eyeButton(eyeId));
  return li;
}

function eyeButton(id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "eye-btn";
  button.dataset.eye = id;
  button.setAttribute("aria-label", `Hide ${id.charAt(0).toUpperCase()}${id.slice(1)}`);
  button.innerHTML = eyeSvg(true);
  button.addEventListener("click", () => toggleFlag(id));
  return button;
}

function rowMarkup(kind, name) {
  const mark = kind === "camera"
    ? `<svg class="kind-svg" viewBox="0 0 16 12" aria-hidden="true"><path d="M1 3.5h3.2L5.4 2h4.2l1.2 1.5H15v7H1z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="7" r="1.8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`
    : `<span class="kind ${kind}" aria-hidden="true"></span>`;
  return `<span class="spacer" aria-hidden="true"></span>${mark}<span class="name">${name}</span>`;
}

function eyeSvg(open) {
  const slash = open ? "" : `<path d="M2 9 L14 1" stroke="currentColor" stroke-width="1.4"/>`;
  return `<svg class="eye" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5s3-4 7-4 7 4 7 4-3 4-7 4S1 5 1 5z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="5" r="1.6" fill="currentColor"/>${slash}</svg>`;
}

function choose(item, button) {
  if (!round || round.solved || runOver || button.disabled) return;
  const step = CHAIN[stepNo];
  if (!step || item.id !== step.id) {
    const later = CHAIN.some((entry) => entry.id === item.id);
    miss(later ? null : button);
    return;
  }

  clearTimeout(agentTimer);
  round.locked.delete(item.id);
  const cell = round.empty.shift();
  if (cell !== undefined) round.placement.set(cell, item);
  foundRooms += 1;
  streak += 1;
  score += FIND_POINTS;
  paintScore();
  gainEl.classList.remove("down");
  gainEl.textContent = `+${FIND_POINTS}`;
  playCue("right");
  button.disabled = true;
  button.classList.add("found");
  drawRoom(cell === undefined ? undefined : { item, cell });
  paintEyes();
  if (item.id === "key") {
    round.keyHidden = false;
    round.solved = true;
    drawRoom();
    finish(true);
    return;
  }
  const bridge = foundLine(stepNo);
  stepNo += 1;
  prefetch(stepNo, "riddle");
  prefetch(stepNo, "found");
  paintScore();
  noteEl.textContent = clueLine(stepNo);
  enqueueSpeech(bridge);
  enqueueSpeech(clueLine(stepNo));
  narrate(ASIDES[stepNo % ASIDES.length], "aside");
}

function miss(button) {
  if (!round || round.solved || runOver) return;
  streak = 0;
  misses += 1;
  score = Math.max(0, score - PENALTY);
  paintScore();
  drawRoom();
  gainEl.classList.add("down");
  gainEl.textContent = `-${PENALTY}`;
  if (button) {
    button.disabled = true;
    button.classList.add("miss");
  }
  if (misses >= MISSES) {
    clearTimeout(agentTimer);
    round.solved = true;
    lockList();
    finish(false);
    return;
  }
  playCue("wrong");
  narrate(TAUNTS[(misses - 1) % TAUNTS.length], "wrong");
}

function agentPlay() {
  if (!round || round.solved) return;
  if (roomNo === 4 || roomNo === 7) {
    agentHideKey();
    return;
  }
  applyHide(takeHide());
}

function applyHide(taken) {
  if (!taken) return;
  const names = publicNames([taken.item]);
  const fallback = `I closed the ${taken.item.name}. I still decide what this picture shows, and the object I kept is not this one.`;
  drawRoom();
  paintEyes();
  touchRoom();
  playCue("shutter");
  if (taken.line && lineAllowed(taken.line, names)) {
    if (voiceLive) {
      pendingSay = { line: taken.line, el: noteEl };
      return;
    }
    noteEl.textContent = taken.line;
    speak(++beat, taken.line);
    return;
  }
  say(fallback, "taunt", names);
}

function takeHide() {
  if (!round || round.solved || round.agentActs >= 2) return null;
  const showing = showingItems();
  if (showing.length <= 2) return null;
  const ticket = round.hideTicket;
  if (ticket) ticket.state = "spent";
  let item = null;
  let line = null;
  if (ticket && ticket.id) {
    item = showing.find((object) => object.id === ticket.id) || null;
    line = item ? ticket.line : null;
  }
  if (!item) item = showing[Math.floor(Math.random() * showing.length)];
  round.concealed.add(item.id);
  round.agentHid.add(item.id);
  round.agentActs += 1;
  queueHide();
  return { item, line };
}

function agentHideKey() {
  if (!round || round.solved || round.agentActs >= 2 || round.keyHidden) return;
  round.keyHidden = true;
  round.agentHidKey = true;
  round.agentActs += 1;
  playCue("shutter");
  say("I closed the key, and the light stays out until that eye is opened.", "key", publicNames([{ id: "key", name: "Key" }]));
  drawRoom();
  paintEyes();
  touchRoom();
}

function toggleFlag(id) {
  if (!round || round.solved || runOver) return;
  playCue("eye");
  if (id === "camera") {
    round.cameraHidden = !round.cameraHidden;
    drawRoom();
    paintEyes();
    return;
  }
  if (round.locked && round.locked.has(id)) {
    paintEyes();
    return;
  }
  if (round.concealed.has(id)) round.concealed.delete(id);
  else round.concealed.add(id);
  drawRoom();
  paintEyes();
}

function answerAgent() {
  if (!round || round.solved || round.agentActs >= 2) return;
  clearTimeout(agentTimer);
  agentTimer = setTimeout(() => {
    if (!round || round.solved) return;
    applyHide(takeHide());
  }, 1400);
}

function itemById(id) {
  return KIT.find((item) => item.id === id) || null;
}

function flagOpen(id) {
  if (!round) return true;
  if (id === "camera") return !round.cameraHidden;
  if (round.locked && round.locked.has(id)) return false;
  return !round.concealed.has(id);
}

function paintEyes() {
  listEl.querySelectorAll(".eye-btn").forEach((button) => {
    const id = button.dataset.eye;
    const open = flagOpen(id);
    button.classList.toggle("shut", !open);
    button.innerHTML = eyeSvg(open);
    const label = id.charAt(0).toUpperCase() + id.slice(1);
    button.setAttribute("aria-label", open ? `Hide ${label}` : `Show ${label}`);
    button.setAttribute("aria-pressed", open ? "false" : "true");
  });
}

function agentShift() {
  const cells = [...round.placement.keys()];
  if (!cells.length || !round.empty.length) return null;
  const from = cells[Math.floor(Math.random() * cells.length)];
  const item = round.placement.get(from);
  const toIndex = Math.floor(Math.random() * round.empty.length);
  const to = round.empty[toIndex];
  round.placement.delete(from);
  round.placement.set(to, item);
  round.empty[toIndex] = from;
  round.shifted = item.id;
  return item;
}

function touchRoom() {
  roomEl.classList.remove("agent-touch");
  void roomEl.offsetWidth;
  roomEl.classList.add("agent-touch");
}

function lockList() {
  listEl.querySelectorAll("button.object").forEach((other) => {
    other.disabled = true;
  });
}

function paintScore() {
  scoreEl.textContent = String(score);
  missesEl.textContent = `${misses}/${MISSES}`;
  roomNoEl.textContent = round ? `${Math.min(stepNo + 1, CHAIN.length)}/${CHAIN.length}` : "—";
  const best = readNumber(BEST_KEY);
  bestEl.textContent = best ? String(best) : "—";
}

function finish(cleared) {
  if (runOver) return;
  runOver = true;
  clearInterval(timerId);
  clearTimeout(agentTimer);
  timeEl.textContent = "—";
  endingReward.hidden = true;
  endingReward.replaceChildren();

  if (cleared) {
    score += CLEAR_BONUS;
    const previous = readNumber(BEST_KEY);
    const beatBest = score > previous;
    writeNumber(CLEARS_KEY, readNumber(CLEARS_KEY) + 1);
    if (beatBest) writeNumber(BEST_KEY, score);
    paintScore();
    const figure = document.createElement("div");
    figure.innerHTML = keyShape();
    const caption = document.createElement("p");
    caption.textContent = "Key";
    endingReward.append(figure, caption);
    endingReward.hidden = false;
    endingTitle.textContent = "You got out";
    endingScore.textContent = `${score} points. ${CLEAR_BONUS} of that is for opening the door.`;
    endingCopy.textContent = WIN_LINE;
    enqueueSpeech(WIN_LINE);
  } else {
    paintScore();
    const best = readNumber(BEST_KEY);
    endingTitle.textContent = "The door stayed shut";
    endingScore.textContent = best ? `${score} points. Best escape is ${best}.` : `${score} points.`;
    endingCopy.textContent = FAIL_LINE;
    enqueueSpeech(FAIL_LINE);
  }

  endingEl.hidden = false;
  playCue(cleared ? "win" : "miss");
  againBtn.focus();
}

function prop(item, arriving, shifted) {
  const el = document.createElement("div");
  el.className = ["prop", arriving ? "arrive" : "", shifted ? "shifted" : ""].filter(Boolean).join(" ");
  el.innerHTML = item.svg();
  return el;
}

function readNumber(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* The reward still shows for this sitting. */
  }
}

function prefOn(key) {
  try {
    return localStorage.getItem(key) !== "0";
  } catch {
    return true;
  }
}

function writePref(key, on) {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* This sitting keeps the toggle. */
  }
}

function travel() {
  return {
    x: Math.max(0, roomEl.offsetWidth - viewportEl.clientWidth),
    y: Math.max(0, roomEl.offsetHeight - viewportEl.clientHeight)
  };
}

function setAim(x, y) {
  const span = travel();
  aimX = Math.max(-span.x, Math.min(0, x));
  aimY = Math.max(-span.y, Math.min(0, y));
  viewportEl.style.setProperty("--aim-x", `${aimX}px`);
  viewportEl.style.setProperty("--aim-y", `${aimY}px`);
}

function openingShot() {
  const span = travel();
  const across = 0.5;
  const down = 0.42;
  setAim(-span.x * across, -span.y * down);
}

window.addEventListener("resize", () => setAim(aimX, aimY));

function endDrag(event) {
  if (!drag || (event && event.pointerId !== drag.id)) return;
  drag = null;
}

function lookDirs() {
  return {
    KeyW: [0, 1],
    ArrowUp: [0, 1],
    KeyS: [0, -1],
    ArrowDown: [0, -1],
    KeyA: [1, 0],
    ArrowLeft: [1, 0],
    KeyD: [-1, 0],
    ArrowRight: [-1, 0]
  };
}

function onLookKey(event) {
  if (settingsEl.open || !introEl.hidden) return;
  if (!lookDirs()[event.code]) return;
  if (round && round.cameraHidden) return;
  if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  event.preventDefault();
  const idle = keys.size === 0;
  keys.add(event.code);
  if (idle) {
    playCue("look");
    panClock = 0;
    requestAnimationFrame(panStep);
  }
}

function panStep(now) {
  if (!keys.size) {
    panClock = 0;
    return;
  }
  const dt = panClock ? Math.min(32, now - panClock) : 16;
  panClock = now;
  const dirs = lookDirs();
  let x = 0;
  let y = 0;
  keys.forEach((code) => {
    const step = dirs[code];
    if (!step) return;
    x += step[0];
    y += step[1];
  });
  if (x || y) setAim(aimX + x * 0.42 * dt, aimY + y * 0.42 * dt);
  requestAnimationFrame(panStep);
}

function paintVoiceStatus() {
  if (!voiceStatus) return;
  fetch("/voice").then((response) => response.json()).then((data) => {
    if (!data.ready) {
      voiceStatus.textContent = "Voice is off until .env has an API key and a voice id, then restart the server.";
      return;
    }
    if (data.error === "401" || data.error === "key-id") {
      voiceStatus.textContent = "ElevenLabs rejected that value. Paste the secret key shown when the key was created, not the key id from the list, then restart the server.";
      return;
    }
    if (data.error) {
      voiceStatus.textContent = "Voice is not speaking yet. Check the key and restart the server.";
      return;
    }
    voiceStatus.textContent = "Voice is ready. Enter the room to hear the narrator.";
  }).catch(() => {
    voiceStatus.textContent = "";
  });
}

function placeCamera() {
  openingShot();
}

function paintCamera() {
  const shut = Boolean(round && round.cameraHidden);
  viewportEl.classList.toggle("camera-shut", shut);
  viewportEl.classList.toggle("drift", false);
}

function mountGimbal() {
  const mark = cameraMark();
  mark.style.position = "static";
  gimbalEl.replaceChildren(mark);
}

let scoreBed = null;

function startScore() {
  const ctx = audioContext();
  if (!ctx || scoreBed || !prefOn(MUSIC_KEY)) return;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  const now = ctx.currentTime;
  master.gain.exponentialRampToValueAtTime(0.07, now + 1.4);
  const nodes = [];
  function drone(freq, type, level) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = level;
    osc.connect(gain).connect(master);
    osc.start();
    nodes.push(osc);
  }
  drone(55, "sine", 0.55);
  drone(82, "triangle", 0.16);
  drone(58.5, "sine", 0.12);
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain).connect(master.gain);
  lfo.start();
  nodes.push(lfo);
  const seconds = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 280;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.045;
  noise.connect(filter).connect(noiseGain).connect(master);
  noise.start();
  nodes.push(noise);
  scoreBed = { master, nodes };
}

function stopScore() {
  if (!scoreBed || !audioCtx) {
    scoreBed = null;
    return;
  }
  const { master, nodes } = scoreBed;
  scoreBed = null;
  const now = audioCtx.currentTime;
  try {
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  } catch {
    /* The bed is already gone. */
  }
  setTimeout(() => {
    nodes.forEach((node) => {
      try { node.stop(); } catch { /* Already stopped. */ }
    });
    try { master.disconnect(); } catch { /* Already disconnected. */ }
  }, 500);
}

function audioContext() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function prefLevel(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === "") return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(1, Math.max(0, value / 100));
  } catch {
    return fallback;
  }
}

function writeLevel(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* This sitting keeps the slider. */
  }
}

function soundVolume() {
  if (!prefOn(SOUND_KEY)) return 0;
  return prefLevel(SOUND_LEVEL_KEY, 0.8);
}

function tone(ctx, when, freq, duration, type, level, endFreq) {
  const loud = (level || 0.2) * soundVolume();
  if (loud <= 0.001) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, when + duration);
  gain.gain.setValueAtTime(loud, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function noise(ctx, when, duration, level, frequency) {
  const loud = level * soundVolume();
  if (loud <= 0.001) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(loud, when);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(when);
}

function playCue(kind) {
  if (soundVolume() <= 0) return;
  const ctx = audioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (kind === "right") {
    tone(ctx, now, 698, 0.08, "sine", 0.22);
    tone(ctx, now + 0.08, 880, 0.12, "sine", 0.2);
    return;
  }
  if (kind === "win") {
    tone(ctx, now, 523, 0.09, "sine", 0.2);
    tone(ctx, now + 0.1, 659, 0.09, "sine", 0.2);
    tone(ctx, now + 0.2, 784, 0.09, "sine", 0.2);
    tone(ctx, now + 0.3, 1046, 0.16, "sine", 0.18);
    return;
  }
  if (kind === "wrong") {
    tone(ctx, now, 110, 0.16, "square", 0.12);
    return;
  }
  if (kind === "miss") {
    tone(ctx, now, 360, 0.22, "triangle", 0.2, 90);
    return;
  }
  if (kind === "shutter") {
    noise(ctx, now, 0.05, 0.35, 900);
    tone(ctx, now, 180, 0.08, "square", 0.08);
    return;
  }
  if (kind === "frame") {
    tone(ctx, now, 494, 0.07, "sine", 0.16);
    return;
  }
  if (kind === "look") {
    noise(ctx, now, 0.03, 0.12, 500);
    return;
  }
  noise(ctx, now, 0.025, 0.28, 2200);
  tone(ctx, now, 1480, 0.04, "sine", 0.12);
}

function publicNames(items) {
  return items.filter((item) => item && item.id && item.name).map((item) => ({ id: item.id, name: item.name }));
}

function showingItems() {
  if (!round) return [];
  return [...round.placement.values()].filter((item) => !round.concealed.has(item.id));
}

function lineAllowed(line, names) {
  if (typeof line !== "string") return false;
  const text = line.trim();
  if (!text || text.length > 240) return false;
  const allowed = new Set(names.map((item) => item.name.toLowerCase()));
  const named = [];
  for (const name of KIT_NAMES) {
    if (!new RegExp(`\\b${name}\\b`, "i").test(text)) continue;
    if (!allowed.has(name.toLowerCase())) return false;
    named.push(name);
  }
  if (/\bkept\b/i.test(text) && named.length) return false;
  if (/\b(you|your|yourself|breath|remembers|every|whispered|scream|regret|echo|darkness)\b/i.test(text)) return false;
  if (!/^I\b/.test(text)) return false;
  if (!/[.!?]$/.test(text)) return false;
  if (/\b(I am|I'm)\s*[.!?]*$/i.test(text)) return false;
  if (round && round.leftover && !allowed.has(round.leftover.name.toLowerCase())) {
    if (new RegExp(`\\b${round.leftover.name}\\b`, "i").test(text)) return false;
  }
  return true;
}

function ask(event, names) {
  const body = { event, names };
  if (event === "hide") body.allowedIds = names.map((item) => item.id);
  return fetch("/act", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then((response) => (response.ok ? response.json() : null));
}

function say(fallback, event, names, target) {
  if (voiceLive) {
    pendingSay = { fallback, event, names, target: target || noteEl };
    return;
  }
  const el = target || noteEl;
  const token = ++beat;
  const allowed = names || [];
  el.textContent = fallback;
  ask(event, allowed).then((data) => {
    if (token !== beat) return;
    const line = data && data.line && lineAllowed(data.line, allowed) ? data.line : fallback;
    if (voiceLive) {
      pendingSay = { line, el };
      return;
    }
    el.textContent = line;
    speak(token, line);
  }).catch(() => {
    if (token === beat && !voiceLive) speak(token, fallback);
  });
}

function showLine(el, line) {
  el.textContent = line;
  enqueueSpeech(line);
}

function narrate(fallback, event) {
  const stamp = stepNo;
  ask(event, []).then((data) => {
    if (runOver || stamp !== stepNo) return;
    const line = data && data.line && lineAllowed(data.line, []) ? data.line : fallback;
    enqueueSpeech(line);
  }).catch(() => {
    if (!runOver && stamp === stepNo) enqueueSpeech(fallback);
  });
}

function clueLine(index) {
  return varied.get(`${index}:riddle`) || CHAIN[index].riddle;
}

function foundLine(index) {
  return varied.get(`${index}:found`) || CHAIN[index].found;
}

function forbiddenNames(index, includeCurrent) {
  return CHAIN.filter((_, i) => i > index || (includeCurrent && i === index)).map((step) => objectFor(step.id).name);
}

function variationOk(line, forbidden, script) {
  if (typeof line !== "string") return false;
  const text = line.trim();
  if (text.length < 12 || text.length > 240) return false;
  if ((text.match(/[.!?]+/g) || []).length > 2) return false;
  if (!/[.!?]$/.test(text)) return false;
  const known = [...KIT.map((item) => item.name), "Key"];
  const added = known.some((name) => new RegExp(`\\b${name}\\b`, "i").test(text) && !new RegExp(`\\b${name}\\b`, "i").test(script));
  if (added) return false;
  return !forbidden.some((name) => new RegExp(`\\b${name}\\b`, "i").test(text));
}

function prefetch(index, kind) {
  const step = CHAIN[index];
  if (!step) return;
  const script = kind === "found" ? step.found : step.riddle;
  if (!script) return;
  const forbidden = forbiddenNames(index, kind !== "found");
  fetch("/act", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "vary",
      source: script,
      names: forbidden.map((name) => ({ name }))
    })
  }).then((response) => (response.ok ? response.json() : null)).then((data) => {
    if (!round || runOver || stepNo > index) return;
    const line = data && typeof data.line === "string" ? data.line.trim() : "";
    if (!variationOk(line, forbidden, script) || line === script) return;
    const queued = speechQueue.indexOf(script);
    if (queued < 0) return;
    varied.set(`${index}:${kind}`, line);
    speechQueue[queued] = line;
    if (kind === "riddle" && stepNo === index && noteEl.textContent === script) {
      noteEl.textContent = line;
    }
  }).catch(() => {});
}

function enqueueSpeech(line) {
  if (!line || !prefOn(VOICE_KEY)) return;
  speechQueue.push(line);
  drainSpeech();
}

function drainSpeech() {
  if (voiceLive || speechGap || !speechQueue.length) return;
  speak(++beat, speechQueue.shift());
}

function releaseVoice() {
  speakingText = "";
  voiceLive = false;
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio = null;
  }
  clearTimeout(speechGap);
  speechGap = setTimeout(() => {
    speechGap = null;
    const job = pendingSay;
    pendingSay = null;
    if (job && job.line) {
      if (job.el) job.el.textContent = job.line;
      speechQueue.unshift(job.line);
    } else if (job) {
      say(job.fallback, job.event, job.names, job.target);
      return;
    }
    drainSpeech();
  }, SPEECH_GAP_MS);
}

function speak(token, text) {
  if (!prefOn(VOICE_KEY) || !text) return;
  if (voiceLive) {
    speechQueue.push(text);
    return;
  }
  voiceLive = true;
  voiceToken = token;
  speakingText = text;
  const previous = lastSpoken;
  const next = speechQueue[0] || "";
  fetch("/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, previous, next })
  }).then((response) => {
    if (response.status === 204) paintVoiceStatus();
    return response.ok && response.status !== 204 ? response.blob() : null;
  }).then((blob) => {
    if (!blob || !blob.size || token !== voiceToken) {
      releaseVoice();
      return;
    }
    const audio = new Audio(URL.createObjectURL(blob));
    audio.volume = prefLevel(VOICE_LEVEL_KEY, 0.85);
    currentAudio = audio;
    audio.onended = () => releaseVoice();
    audio.play().then(() => {
      lastSpoken = text;
    }).catch(() => releaseVoice());
  }).catch(() => releaseVoice());
}

function unlockAudio() {
  const silent = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
  silent.play().catch(() => {});
}

function queueHide() {
  if (!round || round.solved || round.agentActs >= 2) return;
  if (round.hideTicket && round.hideTicket.state === "pending") return;
  const names = publicNames(showingItems());
  if (names.length <= 2) return;
  const ticket = { state: "pending", id: null, line: null };
  round.hideTicket = ticket;
  ask("hide", names).then((data) => {
    if (ticket.state !== "pending") return;
    if (data && names.some((item) => item.id === data.id)) {
      ticket.id = data.id;
      ticket.line = data.line && lineAllowed(data.line, names) ? data.line : null;
    }
    ticket.state = "ready";
  }).catch(() => {
    if (ticket.state === "pending") ticket.state = "ready";
  });
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function svg(body) {
  return () => `<svg viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
}

function lamp() {
  return svg(`<ellipse cx="32" cy="28" rx="18" ry="8" fill="#f4d48a" opacity="0.35"/><path d="M22 16h20l5 14H17z" fill="#f4d48a"/><path d="M30 30h4v16" fill="#c9856a"/><path d="M22 48h20" stroke="#f7f1e6" stroke-width="3"/>`)();
}
function vase() {
  return svg(`<path d="M26 14h12l2 8h-16z" fill="#f7f1e6"/><path d="M24 22h16c2 8-2 18-8 20s-10-12-8-20z" fill="#d7c4a3"/>`)();
}
function chair() {
  return svg(`<path d="M20 16h24v18H20z" fill="#8a5a3c"/><path d="M18 34h28v5H18z" fill="#c9856a"/><path d="M22 39v12M42 39v12" stroke="#5c3a28" stroke-width="3"/>`)();
}
function bed() {
  return svg(`<path d="M12 34h40v12H12z" fill="#6f5a78"/><path d="M12 28h14v8H12z" fill="#f7f1e6"/><path d="M14 46h36" stroke="#2a2430" stroke-width="3"/>`)();
}
function door() {
  return svg(`<path d="M20 10h24v44H20z" fill="#5c3a28"/><path d="M23 13h18v38H23z" fill="#8a5a3c"/><circle cx="36" cy="34" r="2" fill="#e2a13a"/>`)();
}
function plant() {
  return svg(`<ellipse cx="32" cy="22" rx="12" ry="9" fill="#6f9a78"/><ellipse cx="24" cy="26" rx="7" ry="6" fill="#8fb59a"/><path d="M30 30h4v10" fill="#5c3a28"/><path d="M22 42h20l-2 8H24z" fill="#c9856a"/>`)();
}
function frame() {
  return svg(`<rect x="14" y="12" width="36" height="40" fill="#8a5a3c"/><rect x="20" y="18" width="24" height="28" fill="#2a3a58"/><path d="M20 36l8-8 6 6 4-4 6 8z" fill="#6f9a78"/>`)();
}
function clock() {
  return svg(`<circle cx="32" cy="30" r="16" fill="#f7f1e6"/><circle cx="32" cy="30" r="13" fill="#1c2430"/><path d="M32 22v8l7 4" stroke="#e2a13a" stroke-width="2" fill="none"/><circle cx="32" cy="30" r="1.5" fill="#e2a13a"/>`)();
}
function crate() {
  return svg(`<path d="M14 22h36v24H14z" fill="#8a5a3c"/><path d="M14 30h36M32 22v24" stroke="#5c3a28" stroke-width="3"/>`)();
}
function stool() {
  return svg(`<ellipse cx="32" cy="26" rx="16" ry="6" fill="#c9856a"/><path d="M20 28l-4 18M44 28l4 18M26 30l2 16M38 30l-2 16" stroke="#5c3a28" stroke-width="3"/>`)();
}
function mirror() {
  return svg(`<ellipse cx="32" cy="26" rx="14" ry="18" fill="#c9856a"/><ellipse cx="32" cy="26" rx="10" ry="14" fill="#9bb0c4"/><path d="M28 44h8v8h-8z" fill="#8a5a3c"/>`)();
}
function rug() {
  return svg(`<path d="M14 34v-5M22 34v-5M32 34v-5M42 34v-5M50 34v-5M14 54v5M22 54v5M32 54v5M42 54v5M50 54v5" stroke="#c9856a" stroke-width="2"/><rect x="12" y="34" width="40" height="20" rx="2" fill="#6f3d4a"/><rect x="16" y="38" width="32" height="12" fill="none" stroke="#e2a13a" stroke-width="2"/><ellipse cx="32" cy="44" rx="5" ry="3" fill="#c9856a"/>`)();
}
function keyShape() {
  return svg(`<circle cx="22" cy="28" r="8" fill="#e2a13a"/><circle cx="22" cy="28" r="3" fill="#1c1814"/><path d="M30 26h16v4H30zM40 30v6h4v-6zM46 30v4h4v-4z" fill="#e2a13a"/>`)();
}

function shade() {
  return svg(`<path d="M18 18h28l8 22H10z" fill="#f0c14a"/><path d="M32 40v12" stroke="#f7f1e6" stroke-width="3"/>`)();
}
