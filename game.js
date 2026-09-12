'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Paletas de colores por skin. El índice 0 es `null` (celda vacía),
// el resto son los 7 tipos de pieza (I, O, T, S, Z, J, L).
const COLOR_THEMES = {
  retro: [
    null,
    '#4dd0e1', // I - cyan
    '#ffd54f', // O - yellow
    '#ba68c8', // T - purple
    '#81c784', // S - green
    '#e57373', // Z - red
    '#7986cb', // J - indigo
    '#ffb74d', // L - orange
  ],
  neon: [
    null,
    '#00e5ff', // I - cyan neón
    '#fff176', // O - amarillo neón
    '#e040fb', // T - magenta neón
    '#69f0ae', // S - verde neón
    '#ff5252', // Z - rojo neón
    '#7c4dff', // J - violeta neón
    '#ffab40', // L - naranja neón
  ],
  pastel: [
    null,
    '#a7d8de', // I - celeste pastel
    '#fde2a7', // O - amarillo pastel
    '#d9b8e8', // T - lila pastel
    '#b7e4c7', // S - verde pastel
    '#f4b6b6', // Z - rosa pastel
    '#c3c9f0', // J - azul pastel
    '#f7cfa0', // L - naranja pastel
  ],
  pixel: [
    null,
    '#38b2ac', // I
    '#ecc94b', // O
    '#9f7aea', // T
    '#68d391', // S
    '#fc8181', // Z
    '#7f9cf5', // J
    '#f6ad55', // L
  ],
};

let currentSkin = 'retro';
let COLORS = COLOR_THEMES[currentSkin];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function applyTheme(isLight) {
  document.body.classList.toggle('light-theme', isLight);
  themeToggleBtn.textContent = isLight ? '☀️' : '🌙';
}

function initTheme() {
  const isLight = localStorage.getItem('theme') === 'light';
  applyTheme(isLight);
}

function toggleTheme() {
  const isLight = !document.body.classList.contains('light-theme');
  applyTheme(isLight);
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function applySkin(skin) {
  document.body.classList.remove('theme-neon', 'theme-pastel', 'theme-pixel');
  if (skin !== 'retro') document.body.classList.add(`theme-${skin}`);
  currentSkin = skin;
  COLORS = COLOR_THEMES[skin];
  skinSelect.value = skin;
  localStorage.setItem('tetris-skin', skin);
}

function initSkin() {
  const saved = localStorage.getItem('tetris-skin');
  const skin = COLOR_THEMES[saved] ? saved : 'retro';
  applySkin(skin);
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const drawFn = BLOCK_DRAWERS[currentSkin] || drawBlockRetro;
  drawFn(context, x, y, colorIndex, size, alpha);
}

// Skin Retro: bloques cuadrados, colores planos (comportamiento original).
function drawBlockRetro(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

// Skin Neon: fondo oscuro, efecto de brillo (glow) con shadowBlur.
function drawBlockNeon(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.shadowColor = color;
  context.shadowBlur = 14;
  context.fillStyle = color;
  context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
  // segundo relleno para intensificar el brillo sin duplicar la sombra
  context.shadowBlur = 0;
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(x * size + 2, y * size + 2, size - 4, 4);
  context.restore();
}

// Skin Pastel: colores suaves, esquinas redondeadas simuladas con arcos.
function drawBlockPastel(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  const px = x * size + 2;
  const py = y * size + 2;
  const w = size - 4;
  const h = size - 4;
  const r = Math.min(6, w / 2, h / 2);
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(px + r, py);
  context.lineTo(px + w - r, py);
  context.arcTo(px + w, py, px + w, py + r, r);
  context.lineTo(px + w, py + h - r);
  context.arcTo(px + w, py + h, px + w - r, py + h, r);
  context.lineTo(px + r, py + h);
  context.arcTo(px, py + h, px, py + h - r, r);
  context.lineTo(px, py + r);
  context.arcTo(px, py, px + r, py, r);
  context.closePath();
  context.fill();
  // highlight suave en la parte superior
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.beginPath();
  context.moveTo(px + r, py);
  context.lineTo(px + w - r, py);
  context.arcTo(px + w, py, px + w, py + r, r);
  context.lineTo(px + w, py + Math.min(5, h));
  context.lineTo(px, py + Math.min(5, h));
  context.lineTo(px, py + r);
  context.arcTo(px, py, px + r, py, r);
  context.closePath();
  context.fill();
  context.restore();
}

// Skin Pixel art: bloque plano con una textura tipo dither/checkerboard encima.
function drawBlockPixel(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(px, py, w, h);

  // sub-cuadrícula 4x4 con sombreado alterno para simular textura pixel art
  const cells = 4;
  const cw = w / cells;
  const ch = h / cells;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const isDark = (r + c) % 2 === 0;
      context.fillStyle = isDark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)';
      context.fillRect(px + c * cw, py + r * ch, cw, ch);
    }
  }

  // borde marcado, típico de pixel art
  context.strokeStyle = 'rgba(0,0,0,0.35)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
  context.restore();
}

const BLOCK_DRAWERS = {
  retro: drawBlockRetro,
  neon: drawBlockNeon,
  pastel: drawBlockPastel,
  pixel: drawBlockPixel,
};

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-line-color').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
themeToggleBtn.addEventListener('click', toggleTheme);
skinSelect.addEventListener('change', () => applySkin(skinSelect.value));

initTheme();
initSkin();
init();
