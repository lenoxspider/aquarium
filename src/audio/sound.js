/**
 * Everything you hear is synthesised at runtime: a filtered noise bed for the
 * water itself, sine blips for bubbles, a splash for food and a sweep when the
 * tank panics. No audio files, and nothing starts until the visitor enters.
 */
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
    this._lastPop = 0;
  }

  unlock() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this._bed();
  }

  _noiseBuffer(seconds = 2) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  /** The room tone of a tank: low filtered noise breathing slowly. */
  _bed() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(3);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0.5;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    lfo.start();
  }

  setEnabled(on) {
    this.enabled = on;
    if (on) this.unlock();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.5 : 0, t, 0.4);
  }

  _burst({ duration = 0.3, type = 'bandpass', freq = 900, q = 1, gain = 0.2, sweep = 0 }) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(Math.max(0.6, duration + 0.1));

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = q;
    if (sweep) filter.frequency.linearRampToValueAtTime(Math.max(60, freq + sweep), t + duration);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  feed() {
    this._burst({ duration: 0.35, freq: 1500, q: 0.8, gain: 0.22, sweep: -800 });
  }

  startle() {
    this._burst({ duration: 0.6, freq: 300, q: 1.2, gain: 0.28, sweep: 1500 });
  }

  shutter() {
    this._burst({ duration: 0.09, freq: 2600, q: 2, gain: 0.18 });
  }

  pop(strength = 1) {
    if (!this.ctx || !this.enabled) return;
    const now = performance.now();
    if (now - this._lastPop < 110) return;
    this._lastPop = now;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const f = 500 + Math.random() * 500;
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.07);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 * strength, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}
