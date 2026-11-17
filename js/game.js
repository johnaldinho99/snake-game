// Pure game logic: no DOM, no timers. The game advances one cell per step().
// All randomness goes through state.rng so tests can be deterministic.

import { GRID, DIFFICULTIES, POINTS, BONUS, GHOST } from './config.js';

export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const MAX_QUEUED_TURNS = 3;

const samePos = (a, b) => a && b && a.x === b.x && a.y === b.y;
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function createGame(difficultyId = 'medium', { rng = Math.random, cols = GRID.cols, rows = GRID.rows } = {}) {
  const difficulty = DIFFICULTIES[difficultyId] ?? DIFFICULTIES.medium;
  const cy = Math.floor(rows / 2);
  const cx = Math.floor(cols / 2);
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];

  const state = {
    cols,
    rows,
    difficulty,
    rng,
    snake,
    prevSnake: snake.map((p) => ({ ...p })),
    dir: 'right',
    dirQueue: [],
    apple: null,
    bonus: null, // { x, y, remainingMs }
    ghosts: [], // { x, y, phase: 'warn' | 'active' | 'fade', phaseMs }
    score: 0,
    applesEaten: 0,
    ghostsDodged: 0,
    tickMs: difficulty.startTickMs,
    elapsedMs: 0,
    ghostTimerMs: 0,
    alive: true,
    deathCause: null,
  };
  state.apple = randomFreeCell(state);
  return state;
}

/** Queue a turn. Ignores reversals and repeated directions. */
export function queueDirection(state, dir) {
  if (!DIRECTIONS[dir]) return false;
  const last = state.dirQueue.at(-1) ?? state.dir;
  if (dir === last || dir === OPPOSITE[last]) return false;
  if (state.dirQueue.length >= MAX_QUEUED_TURNS) return false;
  state.dirQueue.push(dir);
  return true;
}

/**
 * Advance the game by one tick.
 * @returns {Array<object>} events that happened this tick (for UI/sound).
 */
export function step(state) {
  if (!state.alive) return [];
  const events = [];
  const dt = state.tickMs;
  const mult = state.difficulty.multiplier;

  state.prevSnake = state.snake.map((p) => ({ ...p }));
  if (state.dirQueue.length) state.dir = state.dirQueue.shift();

  const head = state.snake[0];
  const d = DIRECTIONS[state.dir];
  const next = { x: head.x + d.x, y: head.y + d.y };

  if (next.x < 0 || next.y < 0 || next.x >= state.cols || next.y >= state.rows) {
    return die(state, 'wall', events);
  }

  const eatsApple = samePos(next, state.apple);
  const eatsBonus = samePos(next, state.bonus);
  const grows = eatsApple || eatsBonus;

  // When not growing, the tail moves away this tick, so the head may enter it.
  const body = grows ? state.snake : state.snake.slice(0, -1);
  if (body.some((p) => samePos(p, next))) return die(state, 'self', events);

  if (state.ghosts.some((g) => g.phase === 'active' && samePos(g, next))) {
    return die(state, 'ghost', events);
  }

  state.snake.unshift(next);
  if (!grows) state.snake.pop();

  if (eatsApple) {
    const points = POINTS.apple * mult;
    state.score += points;
    state.applesEaten += 1;
    state.tickMs = Math.max(state.difficulty.minTickMs, state.tickMs - state.difficulty.speedupPerApple);
    state.apple = randomFreeCell(state);
    events.push({ type: 'apple', points, x: next.x, y: next.y });

    if (!state.bonus && state.rng() < BONUS.spawnChance) {
      const cell = randomFreeCell(state);
      if (cell) {
        state.bonus = { ...cell, remainingMs: BONUS.lifetimeMs };
        events.push({ type: 'bonusSpawn', x: cell.x, y: cell.y });
      }
    }
  }

  if (eatsBonus) {
    const points = POINTS.bonus * mult;
    state.score += points;
    state.bonus = null;
    events.push({ type: 'bonus', points, x: next.x, y: next.y });
  }

  state.elapsedMs += dt;
  updateBonus(state, dt, events);
  updateGhosts(state, dt, events);

  if (!state.apple) {
    // Board completely filled – extremely unlikely, but handle it.
    events.push({ type: 'win' });
    state.alive = false;
    state.deathCause = 'win';
  }
  return events;
}

function die(state, cause, events) {
  state.alive = false;
  state.deathCause = cause;
  events.push({ type: 'death', cause });
  return events;
}

function updateBonus(state, dt, events) {
  if (!state.bonus) return;
  state.bonus.remainingMs -= dt;
  if (state.bonus.remainingMs <= 0) {
    events.push({ type: 'bonusExpired', x: state.bonus.x, y: state.bonus.y });
    state.bonus = null;
  }
}

function updateGhosts(state, dt, events) {
  const mult = state.difficulty.multiplier;
  const remaining = [];

  for (const g of state.ghosts) {
    g.phaseMs -= dt;
    if (g.phaseMs > 0) {
      remaining.push(g);
      continue;
    }
    if (g.phase === 'warn') {
      // Fairness: never materialise on top of the snake.
      if (state.snake.some((p) => samePos(p, g))) {
        events.push({ type: 'ghostCancelled', x: g.x, y: g.y });
        continue;
      }
      g.phase = 'active';
      g.phaseMs = randomBetween(state.rng, GHOST.activeMinMs, GHOST.activeMaxMs);
      events.push({ type: 'ghostActive', x: g.x, y: g.y });
      remaining.push(g);
    } else if (g.phase === 'active') {
      g.phase = 'fade';
      g.phaseMs = GHOST.fadeMs;
      remaining.push(g);
    } else {
      const points = POINTS.ghostDodged * mult;
      state.score += points;
      state.ghostsDodged += 1;
      events.push({ type: 'ghostDodged', points, x: g.x, y: g.y });
    }
  }
  state.ghosts = remaining;

  if (state.elapsedMs < GHOST.graceMs) return;
  state.ghostTimerMs += dt;
  if (state.ghostTimerMs >= state.difficulty.ghostIntervalMs && state.ghosts.length < state.difficulty.maxGhosts) {
    state.ghostTimerMs = 0;
    const head = state.snake[0];
    const cell = randomFreeCell(state, (c) => manhattan(c, head) >= GHOST.minDistanceFromHead);
    if (cell) {
      state.ghosts.push({ ...cell, phase: 'warn', phaseMs: GHOST.warnMs });
      events.push({ type: 'ghostSpawn', x: cell.x, y: cell.y });
    }
  }
}

/** Pick a random cell not occupied by snake, food or ghosts. */
export function randomFreeCell(state, predicate = () => true) {
  const occupied = new Set();
  const key = (p) => p.y * state.cols + p.x;
  for (const p of state.snake) occupied.add(key(p));
  if (state.apple) occupied.add(key(state.apple));
  if (state.bonus) occupied.add(key(state.bonus));
  for (const g of state.ghosts) occupied.add(key(g));

  const free = [];
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const c = { x, y };
      if (!occupied.has(key(c)) && predicate(c)) free.push(c);
    }
  }
  if (!free.length) return null;
  return free[Math.floor(state.rng() * free.length)];
}

function randomBetween(rng, min, max) {
  return min + rng() * (max - min);
}
