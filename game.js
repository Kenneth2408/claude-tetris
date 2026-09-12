'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#7986cb', // J - indigo
  '#ffb74d', // L - orange
];

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
const highscoreEntry = document.getElementById('highscore-entry');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const gameoverHighscores = document.getElementById('gameover-highscores');
const gameoverStats = document.getElementById('gameover-stats');
const startScreen = document.getElementById('start-screen');
const startHighscores = document.getElementById('start-highscores');
const startStats = document.getElementById('start-stats');
const playBtn = document.getElementById('play-btn');
const resetScoresBtn = document.getElementById('reset-scores-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let comboCount, bestComboThisGame;
let pendingScoreToSave = null;

const HIGHSCORES_KEY = 'tetris-highscores';
const BEST_COMBO_KEY = 'tetris-best-combo';
const MAX_LINES_KEY = 'tetris-max-lines';
const MAX_HIGHSCORES = 5;

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // almacenamiento no disponible (modo privado, cuota excedida, etc.)
  }
}

function getStoredInt(key) {
  const n = parseInt(localStorage.getItem(key), 10);
  return Number.isFinite(n) ? n : 0;
}

function getHighscores() {
  try {
    const raw = JSON.parse(localStorage.getItem(HIGHSCORES_KEY));
    if (!Array.isArray(raw)) return [];
    return raw.filter(e => e && typeof e.name === 'string' && typeof e.score === 'number');
  } catch {
    return [];
  }
}

function saveHighscores(list) {
  const sorted = [...list].sort((a, b) => b.score - a.score).slice(0, MAX_HIGHSCORES);
  setStorageItem(HIGHSCORES_KEY, JSON.stringify(sorted));
  return sorted;
}

function qualifiesForHighscore(s) {
  const list = getHighscores();
  if (list.length < MAX_HIGHSCORES) return true;
  const min = Math.min(...list.map(e => e.score));
  return s > min;
}

function addHighscore(name, s) {
  const entry = { name, score: s };
  const list = getHighscores();
  list.push(entry);
  const sorted = saveHighscores(list);
  return { list: sorted, index: sorted.indexOf(entry) };
}

function getBestCombo() {
  return getStoredInt(BEST_COMBO_KEY);
}

function setBestCombo(n) {
  setStorageItem(BEST_COMBO_KEY, String(n));
}

function getMaxLines() {
  return getStoredInt(MAX_LINES_KEY);
}

function setMaxLines(n) {
  setStorageItem(MAX_LINES_KEY, String(n));
}

function renderHighscoreList(container, highlight) {
  const list = getHighscores();
  if (list.length === 0) {
    container.innerHTML = '<p class="no-scores">Aún no hay puntuaciones</p>';
    return;
  }
  const rows = list.map((entry, i) => {
    const isNew = highlight && entry.name === highlight.name && entry.score === highlight.score && i === highlight.index;
    return `<li class="${isNew ? 'new-entry' : ''}"><span class="hs-rank">${i + 1}</span><span class="hs-name">${escapeHtml(entry.name)}</span><span class="hs-score">${entry.score.toLocaleString()}</span></li>`;
  }).join('');
  container.innerHTML = `<ol class="highscore-list">${rows}</ol>`;
}

function renderStats(container) {
  container.innerHTML = `
    <p class="stat-row"><span class="label">Mejor combo</span><span class="value">${getBestCombo()}</span></p>
    <p class="stat-row"><span class="label">Líneas máximas</span><span class="value">${getMaxLines()}</span></p>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderStartScreen() {
  renderHighscoreList(startHighscores);
  renderStats(startStats);
}

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
    comboCount++;
    bestComboThisGame = Math.max(bestComboThisGame, comboCount);
    updateHUD();
  } else {
    comboCount = 0;
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
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

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

  if (bestComboThisGame > getBestCombo()) setBestCombo(bestComboThisGame);
  if (lines > getMaxLines()) setMaxLines(lines);

  if (qualifiesForHighscore(score)) {
    pendingScoreToSave = score;
    highscoreEntry.classList.remove('hidden');
    playerNameInput.value = '';
  } else {
    pendingScoreToSave = null;
    highscoreEntry.classList.add('hidden');
  }

  renderHighscoreList(gameoverHighscores);
  renderStats(gameoverStats);

  overlay.classList.remove('hidden');
}

function saveCurrentScore() {
  if (pendingScoreToSave === null) return;
  const name = playerNameInput.value.trim() || 'Jugador';
  const scoreToSave = pendingScoreToSave;
  const { index } = addHighscore(name, scoreToSave);
  pendingScoreToSave = null;
  highscoreEntry.classList.add('hidden');
  renderHighscoreList(gameoverHighscores, { name, score: scoreToSave, index });
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
  comboCount = 0;
  bestComboThisGame = 0;
  pendingScoreToSave = null;
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  highscoreEntry.classList.add('hidden');
  gameoverHighscores.innerHTML = '';
  gameoverStats.innerHTML = '';
  startScreen.classList.add('hidden');
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
saveScoreBtn.addEventListener('click', saveCurrentScore);
playBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});
resetScoresBtn.addEventListener('click', () => {
  if (!confirm('¿Seguro que quieres borrar los records?')) return;
  localStorage.removeItem(HIGHSCORES_KEY);
  localStorage.removeItem(BEST_COMBO_KEY);
  localStorage.removeItem(MAX_LINES_KEY);
  renderStartScreen();
});

// Estado inicial antes de pulsar "Jugar": evita que teclas de juego
// se procesen contra un tablero/pieza aún inexistentes.
paused = false;
gameOver = true;

initTheme();
renderStartScreen();
