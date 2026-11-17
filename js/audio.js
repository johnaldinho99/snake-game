// Tiny synthesized sound effects via WebAudio – no audio files needed.
// Browsers only allow audio after a user gesture, so call unlock() from
// a click/keypress handler before the first sound.

export class Sound {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  tone(freq, duration, { type = 'sine', gain = 0.07, slideTo = null, delay = 0 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  play(name) {
    if (!this.enabled || !this.ctx) return;
    switch (name) {
      case 'apple':
        this.tone(520, 0.09, { type: 'triangle', slideTo: 900 });
        break;
      case 'bonus':
        [660, 880, 1175].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', delay: i * 0.07 }));
        break;
      case 'bonusSpawn':
        this.tone(1320, 0.06, { gain: 0.03 });
        break;
      case 'ghost':
        this.tone(260, 0.4, { slideTo: 150, gain: 0.05 });
        break;
      case 'ghostDodged':
        this.tone(1250, 0.05, { gain: 0.025 });
        break;
      case 'death':
        this.tone(320, 0.55, { type: 'sawtooth', slideTo: 55, gain: 0.06 });
        break;
      case 'count':
        this.tone(440, 0.08, { type: 'square', gain: 0.03 });
        break;
      case 'go':
        this.tone(880, 0.16, { type: 'square', gain: 0.035 });
        break;
      case 'click':
        this.tone(700, 0.03, { gain: 0.025 });
        break;
      default:
        break;
    }
  }
}
