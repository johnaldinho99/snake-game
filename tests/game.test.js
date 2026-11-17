import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, queueDirection, randomFreeCell } from '../js/game.js';
import { DIFFICULTIES, GHOST, POINTS } from '../js/config.js';

// Deterministic RNG: always picks the first candidate and never spawns bonus.
const rngZero = () => 0;
const rngHigh = () => 0.999;

test('snake moves one cell per step', () => {
  const g = createGame('easy', { rng: rngHigh });
  const head = { ...g.snake[0] };
  step(g);
  assert.deepEqual(g.snake[0], { x: head.x + 1, y: head.y });
  assert.equal(g.snake.length, 3);
});

test('reversing direction is ignored', () => {
  const g = createGame('easy');
  assert.equal(queueDirection(g, 'left'), false);
  assert.equal(queueDirection(g, 'up'), true);
  assert.equal(queueDirection(g, 'down'), false); // opposite of queued 'up'
});

test('hitting a wall kills the snake', () => {
  const g = createGame('easy', { rng: rngHigh, cols: 6, rows: 6 });
  let events = [];
  for (let i = 0; i < 10 && g.alive; i++) events = step(g);
  assert.equal(g.alive, false);
  assert.equal(g.deathCause, 'wall');
  assert.equal(events.at(-1).type, 'death');
});

test('eating an apple grows, scores with multiplier and speeds up', () => {
  const g = createGame('hard', { rng: rngHigh });
  const head = g.snake[0];
  g.apple = { x: head.x + 1, y: head.y };
  const tickBefore = g.tickMs;
  const events = step(g);
  assert.equal(g.snake.length, 4);
  assert.equal(g.score, POINTS.apple * DIFFICULTIES.hard.multiplier);
  assert.ok(g.tickMs < tickBefore);
  assert.ok(events.some((e) => e.type === 'apple'));
});

test('running into own body kills the snake', () => {
  const g = createGame('easy', { rng: rngHigh });
  // Head at (2,2) moving left; turning down hits (2,3), a mid-body segment.
  g.snake = [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }];
  g.dir = 'left';
  queueDirection(g, 'down');
  step(g);
  assert.equal(g.alive, false);
  assert.equal(g.deathCause, 'self');
});

test('moving into the tail cell is allowed (tail moves away)', () => {
  const g = createGame('easy', { rng: rngHigh });
  g.apple = { x: 0, y: 0 };
  g.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 6 }, { x: 5, y: 6 }];
  g.dir = 'right';
  queueDirection(g, 'down');
  step(g);
  assert.equal(g.alive, true);
  assert.deepEqual(g.snake[0], { x: 5, y: 6 });
});

test('active ghost is deadly, warning ghost is not', () => {
  const g = createGame('easy', { rng: rngHigh });
  const head = g.snake[0];
  g.ghosts = [{ x: head.x + 1, y: head.y, phase: 'warn', phaseMs: 10_000 }];
  step(g);
  assert.equal(g.alive, true);

  const h2 = g.snake[0];
  g.ghosts = [{ x: h2.x + 1, y: h2.y, phase: 'active', phaseMs: 10_000 }];
  step(g);
  assert.equal(g.alive, false);
  assert.equal(g.deathCause, 'ghost');
});

test('ghost lifecycle: warn -> active -> fade -> gone gives points', () => {
  const g = createGame('medium', { rng: rngZero, cols: 40, rows: 40 });
  g.apple = { x: 0, y: 39 };
  g.ghosts = [{ x: 0, y: 0, phase: 'warn', phaseMs: 1 }];
  g.elapsedMs = -1e9; // suppress new spawns
  step(g);
  assert.equal(g.ghosts[0].phase, 'active');
  g.ghosts[0].phaseMs = 1;
  step(g);
  assert.equal(g.ghosts[0].phase, 'fade');
  g.ghosts[0].phaseMs = 1;
  const events = step(g);
  assert.equal(g.ghosts.length, 0);
  assert.ok(events.some((e) => e.type === 'ghostDodged'));
  assert.equal(g.score, POINTS.ghostDodged * DIFFICULTIES.medium.multiplier);
});

test('ghost about to activate on the snake is cancelled', () => {
  const g = createGame('easy', { rng: rngHigh });
  const tail = g.snake.at(-1);
  g.ghosts = [{ x: tail.x + 1, y: tail.y, phase: 'warn', phaseMs: 1 }];
  const events = step(g);
  assert.equal(g.ghosts.length, 0);
  assert.ok(events.some((e) => e.type === 'ghostCancelled'));
});

test('ghosts spawn after grace period, far from the head', () => {
  const g = createGame('hard', { rng: rngZero });
  g.elapsedMs = GHOST.graceMs;
  g.ghostTimerMs = DIFFICULTIES.hard.ghostIntervalMs;
  const events = step(g);
  const spawn = events.find((e) => e.type === 'ghostSpawn');
  assert.ok(spawn);
  const head = g.snake[0];
  assert.ok(Math.abs(spawn.x - head.x) + Math.abs(spawn.y - head.y) >= GHOST.minDistanceFromHead);
});

test('randomFreeCell never returns an occupied cell', () => {
  const g = createGame('easy', { cols: 4, rows: 1, rng: Math.random });
  g.snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  g.apple = { x: 2, y: 0 };
  g.ghosts = [];
  for (let i = 0; i < 20; i++) assert.deepEqual(randomFreeCell(g), { x: 3, y: 0 });
});
