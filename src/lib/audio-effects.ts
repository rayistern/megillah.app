
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeNodes: AudioScheduledSourceNode[] = [];

function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }
  return { ctx: audioCtx, master: masterGain! };
}

function trackNode(node: AudioScheduledSourceNode) {
  activeNodes.push(node);
  node.onended = () => {
    activeNodes = activeNodes.filter((n) => n !== node);
  };
}

export function stopAllHamanSounds() {
  activeNodes.forEach((n) => {
    try {
      n.stop();
    } catch (e) {
      // Ignore if already stopped
    }
  });
  activeNodes = [];
}

// 1. Grogger (Rattle) - Series of short noise bursts
function playGrogger(ctx: AudioContext, destination: AudioNode) {
  const t = ctx.currentTime;
  const iterations = 6 + Math.floor(Math.random() * 6);
  for (let i = 0; i < iterations; i++) {
    const start = t + i * (0.05 + Math.random() * 0.03);
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      data[j] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1500 + Math.random() * 1000, start);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start(start);
    noise.stop(start + 0.04);
    trackNode(noise);
  }
}

// 2. Boo - Low frequency sweep with some harmonics
function playBoo(ctx: AudioContext, destination: AudioNode) {
  const t = ctx.currentTime;
  const duration = 1.0 + Math.random() * 0.5;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(110 + Math.random() * 20, t);
  osc1.frequency.exponentialRampToValueAtTime(70, t + duration);

  osc2.type = 'square';
  osc2.frequency.setValueAtTime(115 + Math.random() * 20, t);
  osc2.frequency.exponentialRampToValueAtTime(75, t + duration);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.exponentialRampToValueAtTime(250, t + duration);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.15, t + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + duration);
  osc2.stop(t + duration);
  trackNode(osc1);
  trackNode(osc2);
}

// 3. Womp Womp - Classical descending cartoon tones
function playWompWomp(ctx: AudioContext, destination: AudioNode) {
  const t0 = ctx.currentTime;
  const baseFreq = 160 + Math.random() * 40;

  [0, 0.4, 0.8].forEach((delay, i) => {
    const t = t0 + delay;
    const duration = 0.3;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = baseFreq - i * 30;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + duration);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(t);
    osc.stop(t + duration);
    trackNode(osc);
  });
}

// 4. Buzzer - Harsh square wave with modulation
function playBuzzer(ctx: AudioContext, destination: AudioNode) {
  const t = ctx.currentTime;
  const duration = 0.4 + Math.random() * 0.2;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(80 + Math.random() * 20, t);

  const mod = ctx.createOscillator();
  mod.type = 'sawtooth';
  mod.frequency.value = 60;
  const modGain = ctx.createGain();
  modGain.gain.value = 40;

  mod.connect(modGain);
  modGain.connect(osc.frequency);

  gain.gain.setValueAtTime(0.1, t);
  gain.gain.linearRampToValueAtTime(0.1, t + duration - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

  osc.connect(gain);
  gain.connect(destination);

  mod.start(t);
  osc.start(t);
  mod.stop(t + duration);
  osc.stop(t + duration);
  trackNode(osc);
  trackNode(mod);
}

// 5. Slide - Fast frequency sweep
function playSlide(ctx: AudioContext, destination: AudioNode) {
  const t = ctx.currentTime;
  const duration = 0.5 + Math.random() * 0.3;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const up = Math.random() > 0.5;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(up ? 220 : 880, t);
  osc.frequency.exponentialRampToValueAtTime(up ? 880 : 220, t + duration);

  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(t);
  osc.stop(t + duration);
  trackNode(osc);
}

// 6. Bell - Resonant metallic clink
function playBell(ctx: AudioContext, destination: AudioNode) {
  const t = ctx.currentTime;
  const duration = 1.0;
  const baseFreq = 400 + Math.random() * 400;

  [1, 2.76, 5.4, 8.9].forEach((multiplier, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * multiplier, t);

    gain.gain.setValueAtTime(0.1 / (i + 1), t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration / (i + 1));

    osc.connect(gain);
    gain.connect(destination);
    osc.start(t);
    osc.stop(t + duration);
    trackNode(osc);
  });
}

const sounds = [playGrogger, playBoo, playWompWomp, playBuzzer, playSlide, playBell];
let lastIdx = -1;

export function playRandomHamanSound() {
  const context = getAudioCtx();
  if (!context) return;
  const { ctx, master } = context;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  let idx = Math.floor(Math.random() * sounds.length);
  if (idx === lastIdx) {
    idx = (idx + 1) % sounds.length;
  }
  lastIdx = idx;

  sounds[idx](ctx, master);
}
