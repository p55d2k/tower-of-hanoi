const board = document.getElementById("board");
const ctx = board.getContext("2d");

const stepText = document.getElementById("stepText");
const optimalText = document.getElementById("optimalText");
const message = document.getElementById("message");
const diskCountInput = document.getElementById("diskCount");
const srcTower = document.getElementById("srcTower");
const destTower = document.getElementById("destTower");

const resetBtn = document.getElementById("resetBtn");
const moveBtn = document.getElementById("moveBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const solveBtn = document.getElementById("solveBtn");

let isAnimating = false;

const towerPositions = [150, 380, 610];
const baseY = 360;
const poleTopY = 80;
const poleHeight = baseY - poleTopY;
const diskHeight = 22;
const poleWidth = 10;

const palette = [
    "#38bdf8",
    "#60a5fa",
    "#818cf8",
    "#a78bfa",
    "#f472b6",
    "#fb7185",
    "#f97316",
    "#facc15",
    "#4ade80",
    "#34d399",
];

function setMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#ef4444" : "#10b981";
}

function clearMessage() {
    message.textContent = "";
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

function drawScene(state) {
    ctx.clearRect(0, 0, board.width, board.height);

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(60, baseY + 10, 640, 12);

    towerPositions.forEach((x) => {
        ctx.fillStyle = "#64748b";
        ctx.fillRect(x - poleWidth / 2, poleTopY, poleWidth, poleHeight);
    });

    const maxDisk = state.n;
    const maxDiskWidth = 200;
    const minDiskWidth = 70;

    ["A", "B", "C"].forEach((towerKey, idx) => {
        const disks = state.towers[towerKey];
        disks.forEach((disk, level) => {
            const ratio = (disk - 1) / (maxDisk - 1 || 1);
            const width = minDiskWidth + (maxDiskWidth - minDiskWidth) * ratio;
            const x = towerPositions[idx] - width / 2;
            const y = baseY - diskHeight * (level + 1);

            ctx.fillStyle = palette[(disk - 1) % palette.length];
            ctx.fillRect(x, y, width, diskHeight - 2);
            ctx.strokeStyle = "#0f172a";
            ctx.strokeRect(x, y, width, diskHeight - 2);
        });
    });

    stepText.textContent = `Step: ${state.step}`;
    const optimal = Math.pow(2, state.n) - 1;
    optimalText.textContent = `Optimal: ${optimal}`;
}

async function refresh() {
    const state = await getState();
    drawScene(state);
}

function setControlsDisabled(disabled) {
    [
        resetBtn,
        moveBtn,
        undoBtn,
        redoBtn,
        solveBtn,
        diskCountInput,
        srcTower,
        destTower,
    ].forEach((el) => {
        el.disabled = disabled;
    });
}

async function handleMove() {
    if (isAnimating) return;
    clearMessage();
    const src = srcTower.value;
    const dest = destTower.value;
    if (src === dest) {
        setMessage("Pick different towers.", true);
        return;
    }
    const result = await postJson("/move", { src, dest });
    if (!result.ok) {
        setMessage(result.message || "Invalid move.", true);
    }
    drawScene(result.state);
}

async function handleUndo() {
    if (isAnimating) return;
    clearMessage();
    const result = await postJson("/undo");
    drawScene(result.state);
}

async function handleRedo() {
    if (isAnimating) return;
    clearMessage();
    const result = await postJson("/redo");
    drawScene(result.state);
}

async function handleReset() {
    if (isAnimating) return;
    clearMessage();
    const n = Number.parseInt(diskCountInput.value, 10);
    const result = await postJson("/reset", { n });
    if (!result.ok) {
        setMessage(result.message || "Unable to reset.", true);
        return;
    }
    drawScene(result.state);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleSolve() {
    if (isAnimating) return;
    clearMessage();
    isAnimating = true;
    setControlsDisabled(true);

    const response = await postJson("/solve");
    drawScene(response.state);

    for (const move of response.moves) {
        await sleep(280);
        const result = await postJson("/move", move);
        drawScene(result.state);
    }

    isAnimating = false;
    setControlsDisabled(false);
}

resetBtn.addEventListener("click", handleReset);
moveBtn.addEventListener("click", handleMove);
undoBtn.addEventListener("click", handleUndo);
redoBtn.addEventListener("click", handleRedo);
solveBtn.addEventListener("click", handleSolve);

refresh();