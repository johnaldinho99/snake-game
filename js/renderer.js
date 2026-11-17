// Canvas renderer. Draws the board, food, ghosts and snake, plus
// short-lived effects (particles, floating score text, screen shake).

import { GHOST, BONUS } from './config.js';
import { DIRECTIONS } from './game.js';

const COLORS = {
  cellA: '#111a2e',
  cellB: '#0f1729',
  snakeHead: [74, 222, 128],
  snakeTail: [13, 148, 136],
  apple: '#fb7185',
  appleDark: '#be123c',
  leaf: '#4ade80',
  bonus: '#fbbf24',
  ghost: '#a78bfa',
  eyeWhite: '#f8fafc',
  pupil: '#0b1220',
};

const lerp = (a, b, t) => a + (b - a) * t;
const mixRgb = (a, b, t) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = 24;
    this.rows = 24;
    this.size = 0;
    this.cell = 0;
    this.particles = [];
    this.floaters = [];
    this.shakeUntil = 0;
    this.lastNow = performance.now();
    this.boardCache = null;

    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
  }

  setGrid(cols, rows) {
    if (cols === this.cols && rows === this.rows) return;
    this.cols = cols;
    this.rows = rows;
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.max(100, Math.floor(Math.min(rect.width, rect.height)));
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = size;
    this.cell = size / this.cols;
    this.dpr = dpr;
    this.boardCache = this.buildBoardCache();
  }

  buildBoardCache() {
    const off = document.createElement('canvas');
    off.width = this.canvas.width;
    off.height = this.canvas.height;
    const c = off.getContext('2d');
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        c.fillStyle = (x + y) % 2 === 0 ? COLORS.cellA : COLORS.cellB;
        c.fillRect(x * this.cell, y * this.cell, this.cell + 0.5, this.cell + 0.5);
      }
    }
    return off;
  }

  center(gx, gy) {
    return { x: (gx + 0.5) * this.cell, y: (gy + 0.5) * this.cell };
  }

  // ---- effects ----------------------------------------------------------

  shake(ms = 400) {
    this.shakeUntil = performance.now() + ms;
  }

  addBurst(gx, gy, color, count = 14) {
    const { x, y } = this.center(gx, gy);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 0.05 + Math.random() * 0.12;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed * this.cell,
        vy: Math.sin(angle) * speed * this.cell,
        life: 1,
        decay: 0.0018 + Math.random() * 0.0012,
        color,
      });
    }
  }

  addFloater(gx, gy, text, color) {
    const { x, y } = this.center(gx, gy);
    this.floaters.push({ x, y, text, color, born: performance.now() });
  }

  // ---- main render ------------------------------------------------------

  /**
   * @param {object|null} state game state
   * @param {number} alpha 0..1 interpolation between previous and current tick
   */
  render(state, alpha, now) {
    const ctx = this.ctx;
    const dt = Math.min(now - this.lastNow, 50);
    this.lastNow = now;

    ctx.save();
    ctx.clearRect(0, 0, this.size, this.size);
    if (now < this.shakeUntil) {
      const k = (this.shakeUntil - now) / 400;
      ctx.translate((Math.random() - 0.5) * 10 * k, (Math.random() - 0.5) * 10 * k);
    }
    ctx.drawImage(this.boardCache, 0, 0, this.size, this.size);

    if (state) {
      if (state.apple) this.drawApple(state.apple, now);
      if (state.bonus) this.drawBonus(state.bonus, now);
      for (const g of state.ghosts) this.drawGhost(g, now);
      this.drawSnake(state, alpha);
    }

    this.drawEffects(dt, now);
    ctx.restore();
  }

  drawApple(apple, now) {
    const ctx = this.ctx;
    const { x, y } = this.center(apple.x, apple.y);
    const r = this.cell * 0.34 * (1 + 0.06 * Math.sin(now / 180));
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grad.addColorStop(0, '#fecdd3');
    grad.addColorStop(0.35, COLORS.apple);
    grad.addColorStop(1, COLORS.appleDark);
    ctx.save();
    ctx.shadowColor = 'rgba(251,113,133,0.55)';
    ctx.shadowBlur = this.cell * 0.5;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y + r * 0.08, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = COLORS.leaf;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.35, y - r * 0.95, r * 0.38, r * 0.18, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBonus(bonus, now) {
    const ctx = this.ctx;
    const { x, y } = this.center(bonus.x, bonus.y);
    const frac = Math.max(0, bonus.remainingMs / BONUS.lifetimeMs);
    const blinking = bonus.remainingMs < 1500 && Math.sin(now / 55) < 0;

    ctx.save();
    ctx.globalAlpha = blinking ? 0.35 : 1;
    ctx.translate(x, y);
    ctx.rotate(now / 900);
    ctx.shadowColor = 'rgba(251,191,36,0.8)';
    ctx.shadowBlur = this.cell * 0.6;
    ctx.fillStyle = COLORS.bonus;
    drawStar(ctx, 0, 0, this.cell * 0.38, this.cell * 0.17, 5);
    ctx.fill();
    ctx.restore();

    // Remaining-time ring
    ctx.save();
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.lineWidth = Math.max(1.5, this.cell * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, this.cell * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    ctx.restore();
  }

  drawGhost(g, now) {
    const ctx = this.ctx;
    const { x, y } = this.center(g.x, g.y);
    const r = this.cell * 0.4;
    let alpha = 1;
    let glow = 0;
    if (g.phase === 'warn') {
      alpha = 0.22 + 0.22 * (0.5 + 0.5 * Math.sin(now / 90));
    } else if (g.phase === 'active') {
      glow = this.cell * 0.7;
    } else {
      alpha = Math.max(0, g.phaseMs / GHOST.fadeMs);
    }
    const bob = g.phase === 'active' ? Math.sin(now / 220 + g.x) * this.cell * 0.05 : 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y + bob);
    ctx.shadowColor = 'rgba(167,139,250,0.9)';
    ctx.shadowBlur = glow;
    ctx.fillStyle = COLORS.ghost;

    // Body: dome on top, wavy hem at the bottom.
    const top = -r * 0.15;
    const hem = r * 0.9;
    ctx.beginPath();
    ctx.arc(0, top, r, Math.PI, 0);
    ctx.lineTo(r, hem);
    const waves = 3;
    const w = (2 * r) / waves;
    const phase = Math.sin(now / 150) * r * 0.08;
    for (let i = 0; i < waves; i++) {
      const x0 = r - i * w;
      ctx.quadraticCurveTo(x0 - w / 2, hem - r * 0.32 + phase, x0 - w, hem);
    }
    ctx.closePath();
    ctx.fill();

    if (g.phase === 'warn') {
      ctx.globalAlpha = 0.9;
      ctx.shadowBlur = 0;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = COLORS.ghost;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = alpha;
    }

    // Eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.eyeWhite;
    for (const ex of [-r * 0.36, r * 0.36]) {
      ctx.beginPath();
      ctx.ellipse(ex, top, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.pupil;
    for (const ex of [-r * 0.36, r * 0.36]) {
      ctx.beginPath();
      ctx.arc(ex + r * 0.06, top + r * 0.06, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSnake(state, alpha) {
    const ctx = this.ctx;
    const { snake, prevSnake } = state;
    const pts = snake.map((p, i) => {
      const prev = prevSnake[i] ?? prevSnake[prevSnake.length - 1];
      return this.center(lerp(prev.x, p.x, alpha), lerp(prev.y, p.y, alpha));
    });
    const n = pts.length;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.cell * 0.72;
    for (let i = n - 1; i > 0; i--) {
      ctx.strokeStyle = mixRgb(COLORS.snakeHead, COLORS.snakeTail, i / Math.max(1, n - 1));
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
      ctx.stroke();
    }

    // Head
    const head = pts[0];
    ctx.shadowColor = 'rgba(74,222,128,0.6)';
    ctx.shadowBlur = state.alive ? this.cell * 0.6 : 0;
    ctx.fillStyle = `rgb(${COLORS.snakeHead.join(',')})`;
    ctx.beginPath();
    ctx.arc(head.x, head.y, this.cell * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes, oriented along the direction of travel
    const d = DIRECTIONS[state.dir];
    const px = -d.y;
    const py = d.x;
    const c = this.cell;
    for (const side of [-1, 1]) {
      const ex = head.x + d.x * c * 0.14 + px * side * c * 0.19;
      const ey = head.y + d.y * c * 0.14 + py * side * c * 0.19;
      if (state.alive) {
        ctx.fillStyle = COLORS.eyeWhite;
        ctx.beginPath();
        ctx.arc(ex, ey, c * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.pupil;
        ctx.beginPath();
        ctx.arc(ex + d.x * c * 0.04, ey + d.y * c * 0.04, c * 0.055, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = COLORS.pupil;
        ctx.lineWidth = Math.max(1.5, c * 0.06);
        const s = c * 0.07;
        ctx.beginPath();
        ctx.moveTo(ex - s, ey - s); ctx.lineTo(ex + s, ey + s);
        ctx.moveTo(ex + s, ey - s); ctx.lineTo(ex - s, ey + s);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawEffects(dt, now) {
    const ctx = this.ctx;
    this.particles = this.particles.filter((p) => (p.life -= p.decay * dt) > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.cell * 0.09 * p.life + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const FLOAT_MS = 900;
    this.floaters = this.floaters.filter((f) => now - f.born < FLOAT_MS);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(this.cell * 0.6)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    for (const f of this.floaters) {
      const t = (now - f.born) / FLOAT_MS;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - t * this.cell * 1.6);
    }
    ctx.globalAlpha = 1;
  }
}

function drawStar(ctx, cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
