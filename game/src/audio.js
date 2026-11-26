// audio.js — all sound is synthesised with WebAudio: no audio files,
// nothing fetched. A tiny engine hum, a chime for rings, a thud for hits.
export class SoundSky {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.hum = null;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 58;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      osc.connect(filter).connect(gain).connect(this.ctx.destination);
      osc.start();
      this.hum = { osc, gain };
    } catch {
      this.ctx = null;
    }
  }

  /** Engine hum follows throttle; call every frame while flying. */
  setHum(throttle, speed, flying) {
    if (!this.ctx || !this.hum || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const target = flying ? 0.015 + throttle * 0.035 : 0;
    this.hum.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.hum.osc.frequency.setTargetAtTime(52 + throttle * 46 + speed * 0.12, this.ctx.currentTime, 0.1);
  }

  blip(freq, dur, type = 'sine', vol = 0.12) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch { /* silence is fine */ }
  }

  ring() { this.blip(880, 0.18); setTimeout(() => this.blip(1318, 0.24), 70); }
  parcel() { this.blip(660, 0.12, 'triangle', 0.1); }
  thud() { this.blip(90, 0.3, 'square', 0.16); }
  stall() { this.blip(220, 0.2, 'square', 0.08); }
  land() { this.blip(523, 0.15); setTimeout(() => this.blip(784, 0.3), 120); }
  click() { this.blip(440, 0.07, 'triangle', 0.08); }
}
