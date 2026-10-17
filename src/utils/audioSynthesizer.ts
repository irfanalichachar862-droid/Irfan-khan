/**
 * Web Audio API synthesizer & Custom Audio File player for ScanWake
 * Supports continuous looping, custom uploaded audio files, custom synth frequencies, and volume guard
 */

let audioCtx: AudioContext | null = null;
let currentOsc1: OscillatorNode | null = null;
let currentOsc2: OscillatorNode | null = null;
let currentGainNode: GainNode | null = null;
let currentLfo: OscillatorNode | null = null;
let currentInterval: any = null;
let currentAudioElement: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export type AlarmToneId =
  | 'loud_siren'
  | 'high_tech_pulse'
  | 'military_bugle'
  | 'cyber_klaxon'
  | 'radar_alert'
  | 'custom_synth'
  | 'custom_audio';

export interface ToneInfo {
  id: AlarmToneId;
  name: string;
  description: string;
  intensity: 'High' | 'Extreme' | 'Custom';
}

export const AVAILABLE_TONES: ToneInfo[] = [
  {
    id: 'loud_siren',
    name: 'Emergency Siren',
    description: 'Alternating dual-pitch sweeping siren designed to break deep sleep.',
    intensity: 'Extreme',
  },
  {
    id: 'high_tech_pulse',
    name: 'Neon Cyber Pulse',
    description: 'High-frequency rhythmic staccato pings that prevent tune-out.',
    intensity: 'High',
  },
  {
    id: 'cyber_klaxon',
    name: 'Industrial Klaxon',
    description: 'Aggressive sawtooth horn blast with heavy distortion envelope.',
    intensity: 'Extreme',
  },
  {
    id: 'military_bugle',
    name: 'Reveille Bugle Call',
    description: 'Upbeat brass-style arpeggio pattern signaling morning rise.',
    intensity: 'High',
  },
  {
    id: 'radar_alert',
    name: 'Submarine Radar',
    description: 'Deep sonar lock-on beeps with escalating harmonic overtones.',
    intensity: 'High',
  },
  {
    id: 'custom_synth',
    name: 'Custom Frequency Synth',
    description: 'Tune your own custom Hz frequency wave for personalized wake-up.',
    intensity: 'Custom',
  },
  {
    id: 'custom_audio',
    name: 'Custom Audio File',
    description: 'Upload your own MP3, WAV, or OGG ringtone from your device.',
    intensity: 'Custom',
  },
];

export interface PlayToneOptions {
  customDataUrl?: string;
  customFreq?: number;
}

export function playAlarmSound(
  toneId: AlarmToneId = 'loud_siren',
  initialVolume: number = 1.0,
  options?: PlayToneOptions
) {
  stopAlarmSound();

  // Handle custom uploaded audio file if provided
  if (toneId === 'custom_audio' && options?.customDataUrl) {
    try {
      const audio = new Audio(options.customDataUrl);
      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, initialVolume));
      currentAudioElement = audio;
      audio.play().catch((err) => {
        console.warn('Custom audio play fallback to siren:', err);
        playSynthesizedTone('loud_siren', initialVolume);
      });
      return;
    } catch (e) {
      console.warn('Error playing custom audio file, falling back to siren', e);
    }
  }

  playSynthesizedTone(toneId, initialVolume, options?.customFreq);
}

function playSynthesizedTone(
  toneId: AlarmToneId,
  initialVolume: number = 1.0,
  customFreq: number = 640
) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(initialVolume, now);
    masterGain.connect(ctx.destination);
    currentGainNode = masterGain;

    if (toneId === 'loud_siren' || toneId === 'custom_audio') {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, now);

      lfo.frequency.setValueAtTime(2.5, now);
      lfoGain.gain.setValueAtTime(250, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.connect(masterGain);
      osc.start();
      lfo.start();

      currentOsc1 = osc;
      currentLfo = lfo;
    } else if (toneId === 'high_tech_pulse') {
      let step = 0;
      currentInterval = setInterval(() => {
        try {
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(step % 2 === 0 ? 880 : 1760, t);
          noteGain.gain.setValueAtTime(0.6, t);
          noteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

          osc.connect(noteGain);
          noteGain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.15);
          step++;
        } catch (_) {}
      }, 150);
    } else if (toneId === 'cyber_klaxon') {
      let isHigh = false;
      currentInterval = setInterval(() => {
        try {
          const t = ctx.currentTime;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const burstGain = ctx.createGain();

          osc1.type = 'square';
          osc2.type = 'sawtooth';
          const freq = isHigh ? 520 : 380;
          osc1.frequency.setValueAtTime(freq, t);
          osc2.frequency.setValueAtTime(freq * 1.02, t);

          burstGain.gain.setValueAtTime(0.7, t);
          burstGain.gain.linearRampToValueAtTime(0.01, t + 0.35);

          osc1.connect(burstGain);
          osc2.connect(burstGain);
          burstGain.connect(masterGain);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.38);
          osc2.stop(t + 0.38);
          isHigh = !isHigh;
        } catch (_) {}
      }, 420);
    } else if (toneId === 'radar_alert') {
      let count = 0;
      currentInterval = setInterval(() => {
        try {
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const pingGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(count % 4 === 3 ? 1320 : 987.77, t);
          pingGain.gain.setValueAtTime(0.75, t);
          pingGain.gain.exponentialRampToValueAtTime(0.005, t + 0.2);

          osc.connect(pingGain);
          pingGain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.22);
          count++;
        } catch (_) {}
      }, 260);
    } else if (toneId === 'custom_synth') {
      const baseFreq = Math.max(150, Math.min(2400, customFreq || 640));
      let toggle = false;
      currentInterval = setInterval(() => {
        try {
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(toggle ? baseFreq * 1.25 : baseFreq, t);
          noteGain.gain.setValueAtTime(0.7, t);
          noteGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

          osc.connect(noteGain);
          noteGain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.25);
          toggle = !toggle;
        } catch (_) {}
      }, 280);
    } else {
      const notes = [196, 261.6, 329.6, 392];
      let noteIndex = 0;
      currentInterval = setInterval(() => {
        try {
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(notes[noteIndex % notes.length], t);
          noteGain.gain.setValueAtTime(0.8, t);
          noteGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

          osc.connect(noteGain);
          noteGain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.25);
          noteIndex++;
        } catch (_) {}
      }, 250);
    }
  } catch (err) {
    console.error('AudioContext playback error', err);
  }
}

export function stopAlarmSound() {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch (_) {}
    currentAudioElement = null;
  }
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }
  if (currentOsc1) {
    try {
      currentOsc1.stop();
      currentOsc1.disconnect();
    } catch (_) {}
    currentOsc1 = null;
  }
  if (currentOsc2) {
    try {
      currentOsc2.stop();
      currentOsc2.disconnect();
    } catch (_) {}
    currentOsc2 = null;
  }
  if (currentLfo) {
    try {
      currentLfo.stop();
      currentLfo.disconnect();
    } catch (_) {}
    currentLfo = null;
  }
  if (currentGainNode) {
    try {
      currentGainNode.disconnect();
    } catch (_) {}
    currentGainNode = null;
  }
}

export function setMasterVolume(vol: number) {
  const clamped = Math.max(0, Math.min(1, vol));
  if (currentAudioElement) {
    currentAudioElement.volume = clamped;
  }
  if (currentGainNode && audioCtx) {
    currentGainNode.gain.setValueAtTime(clamped, audioCtx.currentTime);
  }
}

export function playTestBeep(success: boolean = true) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (success) {
      osc.frequency.setValueAtTime(587, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    } else {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.15);
    }

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (_) {}
}
