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
  action: "The shade was never parented to a room. It waited in the file.",
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
  noteEl.textContent = "The file is not open.";
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
  roomNo += 1;
  const count = visibleCount();
  const deck = shuffle(KIT);
  const visible = deck.slice(0, count);
  const leftover = deck[count];
  const cells = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const placement = new Map();
  visible.forEach((item, index) => placement.set(cells[index], item));
  const empty = cells.filter((cell) => !placement.has(cell));

  round = { leftover, placement, empty, solved: false };
  started = performance.now();
  noteEl.textContent = count < 6
    ? "One object is in the outliner and not in the view."
    : "The room is fuller. One object is still undrawn.";
  gainEl.textContent = "";
  gainEl.classList.remove("down");
  nextBtn.hidden = true;
  paintScore();
  drawRoom();
  drawTree(shuffle([...visible, leftover]));
  armTimer();
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
      miss(null, "The view moved on.", true);
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
    if (item) slot.append(prop(item, extra && extra.item === item));
    roomEl.append(slot);
  }
  roomEl.append(cameraMark());
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
  scene.ul.append(rigRow("Camera", "camera", "The camera is the rig. It is already in the view."));
  scene.ul.append(rigRow("Key", "light", "The key is the rig. It is already in the view."));
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
  const button = document.createElement("button");
  button.type = "button";
  button.className = "object";
  button.dataset.id = item.id;
  button.innerHTML = rowMarkup(item.kind, item.name, false);
  button.addEventListener("click", () => choose(item, button));
  li.append(button);
  return li;
}

function rigRow(name, kind, message) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rig";
  button.innerHTML = rowMarkup(kind, name, true);
  button.addEventListener("click", () => {
    if (runOver || !round || round.solved) return;
    noteEl.textContent = message;
  });
  li.append(button);
  return li;
}

function rowMarkup(kind, name, shown) {
  return `<span class="spacer" aria-hidden="true"></span><span class="kind ${kind}" aria-hidden="true"></span><span class="name">${name}</span>${shown ? eye() : `<span class="eye-slot"></span>`}`;
}

function eye() {
  return `<svg class="eye" viewBox="0 0 16 10" aria-label="In the view"><path d="M1 5s3-4 7-4 7 4 7 4-3 4-7 4S1 5 1 5z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="5" r="1.6" fill="currentColor"/></svg>`;
}

function markShown(button) {
  const slot = button.querySelector(".eye-slot");
  if (slot) slot.outerHTML = eye();
}

function choose(item, button) {
  if (!round || round.solved || button.disabled) return;
  if (item !== round.leftover) {
    miss(button, "Already in the view.");
    return;
  }

  clearInterval(timerId);
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
  noteEl.textContent = item.action;
  lockList();
  button.classList.add("found");
  markShown(button);
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
  noteEl.textContent = message;
  if (button) {
    button.disabled = true;
    button.classList.add("miss");
    markShown(button);
  }
  if (misses >= MISSES) {
    clearInterval(timerId);
    round.solved = true;
    lockList();
    finish(false);
    return;
  }
  if (closeRoom) {
    clearInterval(timerId);
    round.solved = true;
    lockList();
    drawRoom({ item: round.leftover, cell: round.empty[0] });
    noteEl.textContent = `${message} It was the ${round.leftover.name}.`;
    nextBtn.hidden = false;
    nextBtn.textContent = "Next room";
    nextBtn.focus();
  }
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
        ? "The shade is still here, and this close beat the last one."
        : `The shade is still here. Best close stays ${previous}.`;
    endingScore.textContent = `${score} points. ${CLEAR_BONUS} of that is for closing the file.`;
  } else {
    paintScore();
    const best = readNumber(BEST_KEY);
    endingTitle.textContent = "The file closed";
    endingCopy.textContent = best
      ? `The shade stays in the file. Rooms cleared: ${foundRooms}. Best close is ${best}.`
      : `The shade stays in the file. Rooms cleared: ${foundRooms}.`;
    endingScore.textContent = `${score} points`;
  }

  endingEl.hidden = false;
  againBtn.focus();
}

function prop(item, arriving) {
  const el = document.createElement("div");
  el.className = arriving ? "prop arrive" : "prop";
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
