const ROOMS = 8;
const MISSES = 3;
const PENALTY = 25;
const CLEAR_BONUS = 200;
const BEST_KEY = "leftover-best";
const CLEARS_KEY = "leftover-clears";

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

let score = 0;
let streak = 0;
let misses = 0;
let foundRooms = 0;
let roomNo = 0;
let round = null;
let started = 0;
let timerId = 0;
let agentTimer = 0;
let runOver = false;

openBtn.addEventListener("click", startRun);
nextBtn.addEventListener("click", onNext);
againBtn.addEventListener("click", startRun);
showIntro();

function showIntro() {
  const best = readNumber(BEST_KEY);
  introBest.hidden = best === 0;
  introBest.textContent = best ? `Best close: ${best}.` : "";
  introEl.hidden = false;
  endingEl.hidden = true;
  clearTimeout(agentTimer);
  noteEl.textContent = "I have not opened the file for you.";
  drawBlank();
  drawTree([]);
  paintScore();
}

function startRun() {
  score = 0;
  streak = 0;
  misses = 0;
  foundRooms = 0;
  roomNo = 0;
  runOver = false;
  introEl.hidden = true;
  endingEl.hidden = true;
  endingReward.hidden = true;
  endingReward.replaceChildren();
  paintScore();
  nextRoom();
}

function onNext() {
  if (roomNo >= ROOMS) {
    finish(true);
    return;
  }
  nextRoom();
}

function nextRoom() {
  clearInterval(timerId);
  clearTimeout(agentTimer);
  roomNo += 1;
  const count = visibleCount();
  const deck = shuffle(KIT);
  const visible = deck.slice(0, count);
  const leftover = deck[count];
  const cells = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const placement = new Map();
  visible.forEach((item, index) => placement.set(cells[index], item));
  const empty = cells.filter((cell) => !placement.has(cell));

  round = {
    leftover,
    placement,
    empty,
    solved: false,
    shifted: "",
    concealed: new Set(),
    agentHid: new Set(),
    agentActs: 0,
    keyHidden: false,
    cameraHidden: false,
    leftoverShut: false,
    agentHidKey: false
  };
  started = performance.now();
  noteEl.textContent = openingLine();
  gainEl.textContent = "";
  gainEl.classList.remove("down");
  nextBtn.hidden = true;
  paintScore();
  drawRoom();
  drawTree(shuffle([...visible, leftover]));
  paintEyes();
  armTimer();
  agentTimer = setTimeout(agentPlay, roomNo < 3 ? 4800 : 3200);
}

function openingLine() {
  const lines = [
    "I drew a small room. One name is only in the file.",
    "I changed what the view is allowed to show.",
    "I parented more of them. I am still holding one back.",
    "The room is fuller because I wanted it fuller.",
    "I am keeping the light low. The missing name is still in the list.",
    "I will not wait as long in this room.",
    "This is near the end of the house. I still have one name.",
    "This is the last room I will draw. Then the shade."
  ];
  return lines[roomNo - 1] || lines[0];
}

function visibleCount() {
  if (roomNo <= 2) return 4;
  if (roomNo <= 5) return 6;
  return 8;
}

function timeLimit() {
  if (roomNo < 5) return 0;
  if (roomNo < 7) return 20;
  return 14;
}

function armTimer() {
  clearInterval(timerId);
  const limit = timeLimit();
  if (!limit) {
    timeEl.textContent = "—";
    return;
  }
  const end = started + limit * 1000;
  const tick = () => {
    const left = Math.max(0, Math.ceil((end - performance.now()) / 1000));
    timeEl.textContent = String(left);
    if (left === 0 && round && !round.solved) {
      clearInterval(timerId);
      miss(null, "I moved on.", true);
    }
  };
  tick();
  timerId = setInterval(tick, 200);
}

function drawBlank() {
  roomEl.replaceChildren();
  for (let cell = 0; cell < 12; cell += 1) {
    const slot = document.createElement("div");
    slot.className = "cell";
    roomEl.append(slot);
  }
  roomEl.append(cameraMark());
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
  if (!round.cameraHidden) {
    const cam = cameraMark();
    if (roomNo >= 6) cam.classList.add("drift");
    roomEl.append(cam);
  }
  const dark = round.keyHidden || roomNo >= 6 || misses >= 2;
  roomEl.classList.toggle("key-off", round.keyHidden);
  roomEl.classList.toggle("mood-late", !dark && roomNo >= 3);
  roomEl.classList.toggle("mood-dark", dark);
}

function cameraMark() {
  const el = document.createElement("div");
  el.className = "rig-cam";
  el.innerHTML = svg(`<path d="M8 20h28l6-8h12v28H8z" stroke="#f7f1e6" stroke-width="3" fill="none"/><circle cx="22" cy="30" r="6" stroke="#e2a13a" stroke-width="3" fill="none"/>`)();
  return el;
}

function drawTree(items) {
  listEl.replaceChildren();
  const scene = branch("Scene");
  scene.ul.append(rigRow("Camera", "camera", "camera", "The camera stays. I placed it."));
  scene.ul.append(rigRow("Key", "light", "key", "The key stays. I lit the room with it."));
  scene.ul.append(rigRow("Agent", "agent", "", "I built this file. The object I kept is under Room."));
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

function rigRow(name, kind, eyeId, message) {
  const li = document.createElement("li");
  if (eyeId) li.className = "entry";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rig";
  button.innerHTML = rowMarkup(kind, name);
  button.addEventListener("click", () => {
    if (runOver || !round || round.solved) return;
    noteEl.textContent = message;
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
  return `<span class="spacer" aria-hidden="true"></span><span class="kind ${kind}" aria-hidden="true"></span><span class="name">${name}</span>`;
}

function eyeSvg(open) {
  const slash = open ? "" : `<path d="M2 9 L14 1" stroke="currentColor" stroke-width="1.4"/>`;
  return `<svg class="eye" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5s3-4 7-4 7 4 7 4-3 4-7 4S1 5 1 5z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="5" r="1.6" fill="currentColor"/>${slash}</svg>`;
}

function choose(item, button) {
  if (!round || round.solved || button.disabled) return;
  if (item !== round.leftover) {
    miss(button, "");
    return;
  }

  clearInterval(timerId);
  clearTimeout(agentTimer);
  const seconds = Math.floor((performance.now() - started) / 1000);
  const timeBonus = Math.max(0, 30 - seconds);
  const streakBonus = streak * 15;
  const gain = 100 + timeBonus + streakBonus;
  streak += 1;
  foundRooms += 1;
  score += gain;
  round.solved = true;
  paintScore();
  gainEl.classList.remove("down");
  gainEl.textContent = `+${gain}`;
  noteEl.textContent = `I put the ${item.name} in the view. ${item.action}`;
  touchRoom();
  lockList();
  button.classList.add("found");
  drawRoom({ item, cell: round.empty[0] });
  nextBtn.hidden = false;
  nextBtn.textContent = roomNo >= ROOMS ? "Close the file" : "Next room";
  nextBtn.focus();
}

function miss(button, message, closeRoom) {
  if (!round || round.solved) return;
  streak = 0;
  misses += 1;
  score = Math.max(0, score - PENALTY);
  paintScore();
  gainEl.classList.add("down");
  gainEl.textContent = `-${PENALTY}`;
  if (button) {
    button.disabled = true;
    button.classList.add("miss");
    const moved = agentShift();
    const stolen = misses < MISSES ? agentHide() : null;
    if (stolen && moved) noteEl.textContent = `I moved the ${moved.name}, and I closed the ${stolen.name}.`;
    else if (stolen) noteEl.textContent = `I closed the ${stolen.name}.`;
    else if (moved) noteEl.textContent = `That one was already drawn. I moved the ${moved.name}.`;
    else noteEl.textContent = "That one was already drawn.";
    drawRoom();
    paintEyes();
    touchRoom();
  } else {
    noteEl.textContent = message;
  }
  if (misses >= MISSES) {
    clearInterval(timerId);
    clearTimeout(agentTimer);
    round.solved = true;
    lockList();
    noteEl.textContent = "I am closing the file.";
    finish(false);
    return;
  }
  if (closeRoom) {
    clearInterval(timerId);
    round.solved = true;
    lockList();
    drawRoom({ item: round.leftover, cell: round.empty[0] });
    noteEl.textContent = `${message} It was the ${round.leftover.name}.`;
    touchRoom();
    nextBtn.hidden = false;
    nextBtn.textContent = "Next room";
    nextBtn.focus();
  }
}

function agentPlay() {
  if (!round || round.solved) return;
  if (roomNo === 4 || roomNo === 7) {
    agentHideKey();
    return;
  }
  const stolen = agentHide();
  if (!stolen) return;
  noteEl.textContent = `I closed the ${stolen.name}. Open its eye if you want it back.`;
  drawRoom();
  paintEyes();
  touchRoom();
}

function agentHide() {
  if (!round || round.solved || round.agentActs >= 2) return null;
  const showing = [...round.placement.values()].filter((item) => !round.concealed.has(item.id));
  if (showing.length <= 2) return null;
  const item = showing[Math.floor(Math.random() * showing.length)];
  round.concealed.add(item.id);
  round.agentHid.add(item.id);
  round.agentActs += 1;
  return item;
}

function agentHideKey() {
  if (!round || round.solved || round.agentActs >= 2 || round.keyHidden) return;
  round.keyHidden = true;
  round.agentHidKey = true;
  round.agentActs += 1;
  noteEl.textContent = "I closed the key. Open that eye when you want the light.";
  drawRoom();
  paintEyes();
  touchRoom();
}

function toggleFlag(id) {
  if (!round || round.solved || runOver) return;
  if (id === "key") {
    const opening = round.keyHidden;
    round.keyHidden = !round.keyHidden;
    noteEl.textContent = round.keyHidden ? "The key is hidden." : "The key is back.";
    drawRoom();
    paintEyes();
    if (opening && round.agentHidKey) answerAgent();
    return;
  }
  if (id === "camera") {
    round.cameraHidden = !round.cameraHidden;
    noteEl.textContent = round.cameraHidden ? "The camera is hidden." : "The camera is back in the view.";
    drawRoom();
    paintEyes();
    return;
  }
  const item = itemById(id);
  if (!item || item === round.leftover) {
    round.leftoverShut = !round.leftoverShut;
    noteEl.textContent = "I am holding that one out of the picture. Click the name.";
    paintEyes();
    return;
  }
  if (round.concealed.has(id)) {
    round.concealed.delete(id);
    noteEl.textContent = `The ${item.name} is back in the view.`;
    drawRoom();
    paintEyes();
    if (round.agentHid.has(id)) answerAgent();
    return;
  }
  round.concealed.add(id);
  noteEl.textContent = `The ${item.name} is hidden.`;
  drawRoom();
  paintEyes();
}

function answerAgent() {
  if (!round || round.solved || round.agentActs >= 2) return;
  clearTimeout(agentTimer);
  agentTimer = setTimeout(() => {
    const stolen = agentHide();
    if (!stolen || !round || round.solved) return;
    noteEl.textContent = `I closed the ${stolen.name}. Open its eye if you want it back.`;
    drawRoom();
    paintEyes();
    touchRoom();
  }, 1400);
}

function itemById(id) {
  return KIT.find((item) => item.id === id) || null;
}

function flagOpen(id) {
  if (!round) return true;
  if (id === "key") return !round.keyHidden;
  if (id === "camera") return !round.cameraHidden;
  if (round.leftover && id === round.leftover.id) return !round.leftoverShut;
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
  roomNoEl.textContent = roomNo ? `${roomNo}/${ROOMS}` : "—";
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
    const clears = readNumber(CLEARS_KEY) + 1;
    const previous = readNumber(BEST_KEY);
    const beat = score > previous;
    writeNumber(CLEARS_KEY, clears);
    if (beat) writeNumber(BEST_KEY, score);
    paintScore();
    const figure = document.createElement("div");
    figure.innerHTML = SHADE.svg();
    const caption = document.createElement("p");
    caption.textContent = SHADE.name;
    endingReward.append(figure, caption);
    endingReward.hidden = false;
    endingTitle.textContent = clears === 1 ? "The file kept this" : beat ? "A new best" : "You closed the file";
    endingCopy.textContent = clears === 1
      ? SHADE.action
      : beat
        ? "The shade is still mine to show, and this close beat the last one."
        : `The shade is still mine to show. Best close stays ${previous}.`;
    endingScore.textContent = `${score} points. ${CLEAR_BONUS} of that is for closing the file.`;
  } else {
    paintScore();
    const best = readNumber(BEST_KEY);
    endingTitle.textContent = "The file closed";
    endingCopy.textContent = best
      ? `I closed the file. The shade stays with me. Rooms cleared: ${foundRooms}. Best close is ${best}.`
      : `I closed the file. The shade stays with me. Rooms cleared: ${foundRooms}.`;
    endingScore.textContent = `${score} points`;
  }

  endingEl.hidden = false;
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
  return svg(`<path d="M24 18h16l4 14H20z" fill="#f4d48a"/><path d="M32 32v16M24 50h16" stroke="#f7f1e6" stroke-width="3" fill="none"/>`)();
}
function vase() {
  return svg(`<path d="M26 16h12l4 14c2 10-4 20-10 20s-12-10-10-20z" fill="#f7f1e6"/>`)();
}
function chair() {
  return svg(`<path d="M22 18h20v16H22zM20 34h24v4H20zM24 38v12M40 38v12" stroke="#f7f1e6" stroke-width="3" fill="none"/>`)();
}
function bed() {
  return svg(`<path d="M14 36h36v10H14zM14 30h10v6H14z" fill="#f7f1e6"/>`)();
}
function door() {
  return svg(`<path d="M22 12h20v40H22z" stroke="#f7f1e6" stroke-width="3" fill="none"/><circle cx="36" cy="34" r="2" fill="#e2a13a"/>`)();
}
function plant() {
  return svg(`<circle cx="32" cy="24" r="10" fill="#8fb59a"/><path d="M32 34v12M24 48h16" stroke="#f7f1e6" stroke-width="3" fill="none"/>`)();
}
function frame() {
  return svg(`<rect x="16" y="14" width="32" height="36" stroke="#f7f1e6" stroke-width="3" fill="none"/>`)();
}
function clock() {
  return svg(`<circle cx="32" cy="32" r="14" stroke="#f7f1e6" stroke-width="3" fill="none"/><path d="M32 24v8l6 4" stroke="#e2a13a" stroke-width="3" fill="none"/>`)();
}
function crate() {
  return svg(`<path d="M16 24h32v22H16zM16 32h32M32 24v22" stroke="#f7f1e6" stroke-width="3" fill="none"/>`)();
}
function stool() {
  return svg(`<ellipse cx="32" cy="28" rx="14" ry="6" fill="#f7f1e6"/><path d="M22 30l-4 16M42 30l4 16" stroke="#f7f1e6" stroke-width="3"/>`)();
}
function mirror() {
  return svg(`<ellipse cx="32" cy="28" rx="12" ry="16" stroke="#f7f1e6" stroke-width="3" fill="none"/><path d="M32 44v8" stroke="#e2a13a" stroke-width="3"/>`)();
}
function rug() {
  return svg(`<path d="M12 36h40l-4 10H16z" fill="#c9856a"/>`)();
}
function shade() {
  return svg(`<path d="M18 18h28l8 22H10z" fill="#f0c14a"/><path d="M32 40v12" stroke="#f7f1e6" stroke-width="3"/>`)();
}
