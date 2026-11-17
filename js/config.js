// Central game configuration. Tweak balance here.

export const GRID = { cols: 24, rows: 24 };

export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'Lätt',
    multiplier: 1,
    startTickMs: 150,
    minTickMs: 85,
    speedupPerApple: 2,
    ghostIntervalMs: 7000,
    maxGhosts: 1,
  },
  medium: {
    id: 'medium',
    label: 'Medel',
    multiplier: 2,
    startTickMs: 115,
    minTickMs: 65,
    speedupPerApple: 2.5,
    ghostIntervalMs: 5000,
    maxGhosts: 2,
  },
  hard: {
    id: 'hard',
    label: 'Svår',
    multiplier: 3,
    startTickMs: 90,
    minTickMs: 50,
    speedupPerApple: 3,
    ghostIntervalMs: 3500,
    maxGhosts: 3,
  },
};

export const POINTS = {
  apple: 10,
  bonus: 50,
  ghostDodged: 5,
};

export const BONUS = {
  spawnChance: 0.25,
  lifetimeMs: 6000,
};

export const GHOST = {
  graceMs: 3000, // no ghosts during the first seconds of a game
  warnMs: 1500,
  activeMinMs: 3500,
  activeMaxMs: 6000,
  fadeMs: 500,
  minDistanceFromHead: 5,
};

export const HIGHSCORE = {
  storageKey: 'snake.highscores.v1',
  maxEntries: 10,
};
