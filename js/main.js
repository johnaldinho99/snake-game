// App entry point: game loop, input handling and screen management.

import { createGame, step, queueDirection } from './game.js';
import { DIFFICULTIES } from './config.js';
import { Renderer } from './renderer.js';
import { Sound } from './audio.js';
import { loadHighscores, qualifies, saveHighscore, bestScore, clearHighscores } from './highscores.js';

const SETTINGS_KEY = 'snake.settings.v1';
const COUNTDOWN_STEP_MS = 600;
const DEATH_DELAY_MS = 900;

const DEATH_TEXT = {
  wall: 'Du körde in i väggen.',
  self: 'Du bet dig själv i svansen.',
  ghost: 'Ett spöke fick tag på dig!',
  win: 'Du fyllde hela planen – otroligt!',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ---- settings -------------------------------------------------------------

function loadSettings() {
  const defaults = { difficulty: 'medium', sound: true, lastName: '' };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return defaults;
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

const settings = loadSettings();
if (!DIFFICULTIES[settings.difficulty]) settings.difficulty = 'medium';

// ---- state ------------------------------------------------------------------

const renderer = new Renderer($('#board'));
const sound = new Sound(settings.sound);

const screens = {
  menu: $('#screen-menu'),
  help: $('#screen-help'),
  highscores: $('#screen-highscores'),
  countdown: $('#screen-countdown'),
  pause: $('#screen-pause'),
  gameover: $('#screen-gameover'),
};

/** 'menu' | 'help' | 'highscores' | 'countdown' | 'playing' | 'paused' | 'dying' | 'gameover' */
let mode = 'menu';
let game = createGame(settings.difficulty); // preview board behind the menu
let acc = 0;
let lastFrame = performance.now();
let countdownEnd = 0;
let lastCountdownShown = 0;
let lastRank = -1;

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  const focusTarget = name && screens[name].querySelector('[data-autofocus]');
  if (focusTarget && !focusTarget.closest('[hidden]')) focusTarget.focus({ preventScroll: true });
}

function setMode(next, screen = next) {
  mode = next;
  showScreen(screen);
  document.body.dataset.mode = next;
}

// ---- game flow --------------------------------------------------------------

function startGame() {
  sound.unlock();
  game = createGame(settings.difficulty);
  renderer.setGrid(game.cols, game.rows);
  acc = 0;
  lastRank = -1;
  countdownEnd = performance.now() + COUNTDOWN_STEP_MS * 3;
  lastCountdownShown = 0;
  setMode('countdown');
  updateHud();
}

function pauseGame() {
  if (mode !== 'playing' && mode !== 'countdown') return;
  setMode('paused', 'pause');
}

function resumeGame() {
  if (mode !== 'paused') return;
  lastFrame = performance.now();
  // Short countdown after pause so the player can react.
  countdownEnd = performance.now() + COUNTDOWN_STEP_MS * 3;
  lastCountdownShown = 0;
  setMode('countdown');
}

function goToMenu() {
  game = createGame(settings.difficulty);
  acc = 0;
  setMode('menu');
  updateMenu();
}

function handleEvents(events) {
  for (const e of events) {
    switch (e.type) {
      case 'apple':
        sound.play('apple');
        renderer.addBurst(e.x, e.y, '#fb7185');
        renderer.addFloater(e.x, e.y, `+${e.points}`, '#fecdd3');
        break;
      case 'bonus':
        sound.play('bonus');
        renderer.addBurst(e.x, e.y, '#fbbf24', 22);
        renderer.addFloater(e.x, e.y, `+${e.points}`, '#fde68a');
        break;
      case 'bonusSpawn':
        sound.play('bonusSpawn');
        break;
      case 'ghostSpawn':
        sound.play('ghost');
        break;
      case 'ghostDodged':
        sound.play('ghostDodged');
        renderer.addFloater(e.x, e.y, `+${e.points}`, '#c4b5fd');
        break;
      case 'death':
      case 'win':
        sound.play('death');
        renderer.shake();
        mode = 'dying';
        document.body.dataset.mode = 'dying';
        setTimeout(showGameOver, DEATH_DELAY_MS);
        break;
      default:
        break;
    }
  }
  if (events.length) updateHud();
}

function showGameOver() {
  setMode('gameover');
  $('#go-score').textContent = game.score.toLocaleString('sv-SE');
  $('#go-cause').textContent = DEATH_TEXT[game.deathCause] ?? '';
  $('#go-apples').textContent = game.applesEaten;
  $('#go-ghosts').textContent = game.ghostsDodged;
  $('#go-length').textContent = game.snake.length;
  $('#go-level').textContent = game.difficulty.label;

  const form = $('#go-form');
  const result = $('#go-result');
  result.textContent = '';
  if (qualifies(game.score)) {
    form.hidden = false;
    const input = $('#go-name');
    input.value = settings.lastName;
    input.focus();
    input.select();
  } else {
    form.hidden = true;
    result.textContent = game.score > 0 ? `Bästa resultat: ${bestScore().toLocaleString('sv-SE')} p` : '';
    $('#btn-again').focus();
  }
}

function submitHighscore(event) {
  event.preventDefault();
  const name = $('#go-name').value.trim().slice(0, 16) || 'Anonym';
  settings.lastName = name;
  saveSettings();
  lastRank = saveHighscore({
    name,
    score: game.score,
    difficulty: game.difficulty.id,
    length: game.snake.length,
  });
  $('#go-form').hidden = true;
  $('#go-result').textContent = lastRank >= 0 ? `Du kom på plats ${lastRank + 1} på topplistan! 🎉` : '';
  updateHud();
  $('#btn-again').focus();
}

// ---- rendering of DOM parts -------------------------------------------------

function updateHud() {
  $('#hud-score').textContent = game.score.toLocaleString('sv-SE');
  $('#hud-length').textContent = game.snake.length;
  $('#hud-best').textContent = Math.max(bestScore(), game.score).toLocaleString('sv-SE');
  $('#hud-level').textContent = `${game.difficulty.label} ×${game.difficulty.multiplier}`;
}

function updateMenu() {
  for (const btn of $$('[data-difficulty]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.difficulty === settings.difficulty));
  }
  $('#btn-sound').textContent = settings.sound ? 'Ljud: På' : 'Ljud: Av';
  $('#btn-sound').setAttribute('aria-pressed', String(settings.sound));
  updateHud();
}

function renderHighscores() {
  const list = loadHighscores();
  const body = $('#hs-body');
  body.replaceChildren();
  $('#hs-empty').hidden = list.length > 0;
  $('#hs-table').hidden = list.length === 0;
  list.forEach((entry, i) => {
    const tr = document.createElement('tr');
    const cells = [
      i + 1,
      entry.name,
      entry.score.toLocaleString('sv-SE'),
      DIFFICULTIES[entry.difficulty]?.label ?? '–',
      new Date(entry.date).toLocaleDateString('sv-SE'),
    ];
    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = value; // textContent – never inject names as HTML
      tr.append(td);
    }
    if (i < 3) tr.dataset.medal = String(i + 1);
    body.append(tr);
  });
}

// ---- main loop --------------------------------------------------------------

function frame(now) {
  const dt = Math.min(now - lastFrame, 250);
  lastFrame = now;

  if (mode === 'countdown') {
    const left = countdownEnd - now;
    const n = Math.ceil(left / COUNTDOWN_STEP_MS);
    if (left <= 0) {
      sound.play('go');
      acc = 0;
      setMode('playing', null);
    } else if (n !== lastCountdownShown) {
      lastCountdownShown = n;
      $('#countdown-number').textContent = n;
      sound.play('count');
    }
  }

  if (mode === 'playing') {
    acc += dt;
    while (mode === 'playing' && acc >= game.tickMs) {
      acc -= game.tickMs;
      handleEvents(step(game));
    }
  }

  const alpha = mode === 'playing' || mode === 'paused' ? Math.min(acc / game.tickMs, 1) : 1;
  renderer.render(game, alpha, now);
  requestAnimationFrame(frame);
}

// ---- input ------------------------------------------------------------------

const KEY_DIRS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return; // typing a name

  const dir = KEY_DIRS[e.code];
  if (dir) {
    if (mode === 'playing' || mode === 'countdown') {
      e.preventDefault();
      queueDirection(game, dir);
    }
    return;
  }

  const onButton = e.target instanceof HTMLButtonElement;
  switch (e.code) {
    case 'Escape':
    case 'KeyP':
      if (mode === 'playing' || mode === 'countdown') pauseGame();
      else if (mode === 'paused') resumeGame();
      else if (e.code === 'Escape' && ['help', 'highscores', 'gameover'].includes(mode)) goToMenu();
      break;
    case 'Enter':
    case 'Space':
      if (onButton) return; // let the focused button handle it natively
      e.preventDefault();
      if (mode === 'menu' || mode === 'gameover') startGame();
      else if (mode === 'paused') resumeGame();
      break;
    default:
      break;
  }
});

// Swipe controls for touch screens
let touchStart = null;
const boardWrap = $('#board-wrap');
boardWrap.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
boardWrap.addEventListener('touchend', (e) => {
  if (!touchStart || (mode !== 'playing' && mode !== 'countdown')) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  queueDirection(game, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

// ---- buttons ----------------------------------------------------------------

function on(id, handler) {
  $(id).addEventListener('click', () => {
    sound.unlock();
    sound.play('click');
    handler();
  });
}

on('#btn-start', startGame);
on('#btn-again', startGame);
on('#btn-help', () => setMode('help'));
on('#btn-scores', () => { renderHighscores(); setMode('highscores'); });
on('#btn-help-back', goToMenu);
on('#btn-scores-back', goToMenu);
on('#btn-resume', resumeGame);
on('#btn-pause-menu', goToMenu);
on('#btn-go-menu', goToMenu);
on('#btn-pause', () => (mode === 'paused' ? resumeGame() : pauseGame()));
on('#btn-sound', () => {
  settings.sound = !settings.sound;
  sound.setEnabled(settings.sound);
  saveSettings();
  updateMenu();
});
on('#btn-clear-scores', () => {
  if (confirm('Rensa hela topplistan?')) {
    clearHighscores();
    renderHighscores();
    updateHud();
  }
});
for (const btn of $$('[data-difficulty]')) {
  on(`[data-difficulty="${btn.dataset.difficulty}"]`, () => {
    settings.difficulty = btn.dataset.difficulty;
    saveSettings();
    game = createGame(settings.difficulty);
    updateMenu();
  });
}
$('#go-form').addEventListener('submit', submitHighscore);

// ---- boot -------------------------------------------------------------------

setMode('menu');
updateMenu();
requestAnimationFrame(frame);
