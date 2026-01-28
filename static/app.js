const board = document.getElementById("board");
const ctx = board.getContext("2d");

const stepText = document.getElementById("stepText");
const optimalText = document.getElementById("optimalText");
const message = document.getElementById("message");
const diskCountInput = document.getElementById("diskCount");

const resetBtn = document.getElementById("resetBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const solveBtn = document.getElementById("solveBtn");
const logsList = document.getElementById("logsList");
const clearLogsBtn = document.getElementById("clearLogsBtn");
const winBanner = document.getElementById("winBanner");
const winStats = document.getElementById("winStats");

let isAnimating = false;
let currentState = null;
let topDiskRects = [];
let dragging = null;
let solveToken = 0;
let hasWon = false;

const towerKeys = ["A", "B", "C"];
const towerPositions = [150, 380, 610];
const baseY = 360;
const poleTopY = 80;
const poleHeight = baseY - poleTopY;
const diskHeight = 22;
const poleWidth = 10;
const maxDiskWidth = 200;
const minDiskWidth = 70;
const maxLogs = 200;

const palette = [
  "#00d4ff",
  "#4ade80",
  "#f59e0b",
  "#f97316",
  "#fb7185",
  "#f43f5e",
  "#a855f7",
  "#6366f1",
  "#22d3ee",
  "#14b8a6",
];

function setMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#fb7185" : "#34d399";
}

function clearMessage() {
  message.textContent = "";
}

function addLog(text, type = "info") {
  if (!text) return;
  const entry = document.createElement("div");
  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  entry.textContent = `${timestamp} · ${text}`;

  const colorClass =
    type === "error"
      ? "text-rose-300"
      : type === "success"
        ? "text-emerald-300"
        : "text-slate-200";

  entry.className = `rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 ${colorClass}`;
  logsList.appendChild(entry);

  while (logsList.children.length > maxLogs) {
    logsList.removeChild(logsList.firstChild);
  }

  logsList.scrollTop = logsList.scrollHeight;
}

function logStateAction(state, fallback) {
  if (state?.last_action) {
    addLog(state.last_action);
  } else if (fallback) {
    addLog(fallback);
  }
}

async function getState() {
  const response = await fetch("/state");
  const data = await response.json();
  return data.state;
}

async function postJson(url, payload = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

function getDiskRect(state, towerIndex, disk, level) {
  const ratio = (disk - 1) / (state.n - 1 || 1);
  const width = minDiskWidth + (maxDiskWidth - minDiskWidth) * ratio;
  const x = towerPositions[towerIndex] - width / 2;
  const y = baseY - diskHeight * (level + 1);
  return { x, y, width, height: diskHeight - 2 };
}

function drawDisk(rect, color) {
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = "#0f172a";
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function drawScene(state, dragState = null) {
  currentState = state;
  topDiskRects = [];
  ctx.clearRect(0, 0, board.width, board.height);

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(60, baseY + 10, 640, 12);

  towerPositions.forEach((x) => {
    ctx.fillStyle = "#64748b";
    ctx.fillRect(x - poleWidth / 2, poleTopY, poleWidth, poleHeight);
  });

  towerKeys.forEach((towerKey, idx) => {
    const disks = state.towers[towerKey];
    disks.forEach((disk, level) => {
      if (dragState && dragState.src === towerKey && dragState.level === level) {
        return;
      }

      const rect = getDiskRect(state, idx, disk, level);
      const color = palette[(disk - 1) % palette.length];
      drawDisk(rect, color);

      if (level === disks.length - 1) {
        topDiskRects.push({
          tower: towerKey,
          disk,
          level,
          rect,
          color,
        });
      }
    });
  });

  if (dragState) {
    drawDisk(
      { x: dragState.x, y: dragState.y, width: dragState.width, height: dragState.height },
      dragState.color,
    );
  }

  stepText.textContent = `Step: ${state.step}`;
  const optimal = Math.pow(2, state.n) - 1;
  optimalText.textContent = `Optimal: ${optimal}`;
  board.classList.toggle("canvas-dragging", Boolean(dragState));

  updateWinBanner(state);
}

function updateWinBanner(state) {
  const hasAll = state.towers?.C?.length === state.n;
  if (!hasWon && hasAll) {
    hasWon = true;
    addLog("You win!", "success");
  }
  if (hasWon && !hasAll) {
    hasWon = false;
  }
  if (hasAll) {
    winStats.textContent = `Steps: ${state.step} · Optimal: ${Math.pow(2, state.n) - 1}`;
    winBanner.classList.remove("hidden");
    winBanner.classList.add("flex");
  } else {
    winBanner.classList.add("hidden");
    winBanner.classList.remove("flex");
    winStats.textContent = "";
  }
}

async function refresh() {
  const state = await getState();
  drawScene(state);
  logStateAction(state);
}

function setControlsDisabled(disabled, options = {}) {
  const { allowReset = false } = options;
  resetBtn.disabled = disabled && !allowReset;
  undoBtn.disabled = disabled;
  redoBtn.disabled = disabled;
  solveBtn.disabled = disabled;
  diskCountInput.disabled = disabled && !allowReset;
}

function cancelSolve(reason) {
  if (!isAnimating) return;
  solveToken += 1;
  isAnimating = false;
  setControlsDisabled(false);
  if (reason) {
    addLog(reason, "error");
  }
}

async function handleUndo() {
  if (isAnimating) return;
  clearMessage();
  const result = await postJson("/undo");
  drawScene(result.state);
  logStateAction(result.state, "Undo move.");
}

async function handleRedo() {
  if (isAnimating) return;
  clearMessage();
  const result = await postJson("/redo");
  drawScene(result.state);
  logStateAction(result.state, "Redo move.");
}

async function handleReset() {
  clearMessage();
  if (isAnimating) {
    cancelSolve("Solving canceled by reset.");
  }
  const n = Number.parseInt(diskCountInput.value, 10);
  const result = await postJson("/reset", { n });
  if (!result.ok) {
    setMessage(result.message || "Unable to reset.", true);
    addLog(result.message || "Unable to reset.", "error");
    return;
  }
  hasWon = false;
  drawScene(result.state);
  logStateAction(result.state, `Reset to ${result.state.n} disks.`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleSolve() {
  if (isAnimating) return;
  clearMessage();
  isAnimating = true;
  setControlsDisabled(true, { allowReset: true });
  const token = (solveToken += 1);

  const response = await postJson("/solve");
  drawScene(response.state);
  logStateAction(response.state, "Solving started.");

  for (const move of response.moves) {
    if (token !== solveToken) {
      return;
    }
    await sleep(280);
    if (token !== solveToken) {
      return;
    }
    const result = await postJson("/move", move);
    drawScene(result.state);
    logStateAction(result.state, `Move disk from ${move.src} to ${move.dest}.`);
  }

  if (token === solveToken) {
    addLog("Solving complete.", "success");
    isAnimating = false;
    setControlsDisabled(false);
  }
}

function getCanvasPoint(event) {
  const rect = board.getBoundingClientRect();
  const scaleX = board.width / rect.width;
  const scaleY = board.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function getClosestTower(x) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  towerPositions.forEach((pos, idx) => {
    const distance = Math.abs(x - pos);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = idx;
    }
  });
  return towerKeys[closestIndex];
}

async function handleDropMove(src, dest) {
  if (!currentState) return;
  if (src === dest) {
    drawScene(currentState);
    return;
  }
  const result = await postJson("/move", { src, dest });
  if (!result.ok) {
    setMessage(result.message || "Invalid move.", true);
    addLog(result.message || "Invalid move.", "error");
  }
  drawScene(result.state);
  logStateAction(result.state, `Move disk from ${src} to ${dest}.`);
}

function onPointerDown(event) {
  if (isAnimating || !currentState) return;
  const point = getCanvasPoint(event);
  const hit = topDiskRects.find(
    ({ rect }) =>
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height,
  );
  if (!hit) return;

  dragging = {
    disk: hit.disk,
    src: hit.tower,
    level: hit.level,
    width: hit.rect.width,
    height: hit.rect.height,
    color: hit.color,
    x: hit.rect.x,
    y: hit.rect.y,
    offsetX: point.x - hit.rect.x,
    offsetY: point.y - hit.rect.y,
  };

  board.setPointerCapture(event.pointerId);
  drawScene(currentState, dragging);
}

function onPointerMove(event) {
  if (!dragging) return;
  const point = getCanvasPoint(event);
  dragging.x = point.x - dragging.offsetX;
  dragging.y = point.y - dragging.offsetY;
  drawScene(currentState, dragging);
}

async function onPointerUp(event) {
  if (!dragging) return;
  const point = getCanvasPoint(event);
  const src = dragging.src;
  const dest = getClosestTower(point.x);
  dragging = null;
  drawScene(currentState);
  await handleDropMove(src, dest);
  if (board.hasPointerCapture(event.pointerId)) {
    board.releasePointerCapture(event.pointerId);
  }
}

resetBtn.addEventListener("click", handleReset);
undoBtn.addEventListener("click", handleUndo);
redoBtn.addEventListener("click", handleRedo);
solveBtn.addEventListener("click", handleSolve);
clearLogsBtn.addEventListener("click", () => {
  logsList.innerHTML = "";
});

board.addEventListener("pointerdown", onPointerDown);
board.addEventListener("pointermove", onPointerMove);
board.addEventListener("pointerup", onPointerUp);
board.addEventListener("pointerleave", onPointerUp);
board.addEventListener("pointercancel", onPointerUp);

refresh();
