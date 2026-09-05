/**
 * A drone that follows the wave: pitch falls as the view widens, and the
 * filter opens, with an octave above fading in, as novelty deepens. Built
 * on first use so the AudioContext starts inside a user gesture.
 */
export class WaveSound {
  private ctx: AudioContext | null = null;
  private filter: BiquadFilterNode | null = null;
  private master: GainNode | null = null;
  private octave: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;
  enabled = false;

  start(): void {
    if (this.enabled) return;
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    if (ctx.state === "suspended") void ctx.resume();
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(0.09, ctx.currentTime, 0.8);
    this.enabled = true;
  }

  stop(): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    this.enabled = false;
  }

  /** `novelty` 0..1 (1 is the deepest dip), `ladder` the view's position on the cycle ladder, 0..6. */
  set(novelty: number, ladder: number): void {
    if (!this.enabled || !this.ctx || !this.filter || !this.octave) return;
    const t = this.ctx.currentTime;
    const n = Math.min(1, Math.max(0, novelty));
    const base = 110 * Math.pow(2, -Math.min(6, Math.max(0, ladder)) / 3);
    this.oscillators.forEach((o, i) => o.frequency.setTargetAtTime(base * (i === 2 ? 2 : 1) * (1 + (i - 0.5) * 0.004), t, 0.25));
    this.filter.frequency.setTargetAtTime(180 + n * n * 2600, t, 0.2);
    this.octave.gain.setTargetAtTime(n * 0.35, t, 0.3);
  }

  private build(): void {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 3;
    filter.frequency.value = 300;
    filter.connect(master).connect(ctx.destination);
    const octave = ctx.createGain();
    octave.gain.value = 0;
    octave.connect(filter);
    const types: OscillatorType[] = ["sawtooth", "triangle", "sine"];
    this.oscillators = types.map((type, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = 110 * (i === 2 ? 2 : 1);
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.35 : 0.6;
      o.connect(g).connect(i === 2 ? octave : filter);
      o.start();
      return o;
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 60;
    lfo.connect(depth).connect(filter.frequency);
    lfo.start();
    this.ctx = ctx;
    this.master = master;
    this.filter = filter;
    this.octave = octave;
    this.lfo = lfo;
  }
}

export const waveSound = new WaveSound();
