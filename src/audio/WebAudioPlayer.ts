import type { SoundId } from '../engine/audio/sounds';
import { SOUNDS, type Waveform } from '../engine/audio/sounds';
import { MUSIC, MUSIC_BPM, Sequencer } from '../engine/audio/music';
import { gameConfig } from '../engine/config/gameConfig';
import type { AudioPlayer } from '../engine/core/interfaces';

const SETTINGS_KEY = 'bouncing-ball.audio';
/** How far ahead music notes are scheduled, and how often we top up. */
const LOOKAHEAD_SECONDS = 0.15;
const SCHEDULE_INTERVAL_MS = 30;

type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

interface AudioSettings {
  muted: boolean;
  volume: number;
}

/**
 * Chiptune audio with the Web Audio API: every sound is an oscillator, no
 * files. Browsers only allow audio after a user gesture, so nothing is
 * created until `unlock()` is called from one. Mute and volume are saved.
 */
export class WebAudioPlayer implements AudioPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private settings: AudioSettings;
  private wantMusic = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private sequencers: Sequencer[] = [];
  /** AudioContext time at which the music started. */
  private musicStart = 0;

  constructor(private readonly storage: SettingsStorage | null) {
    this.settings = this.load();
  }

  get muted(): boolean {
    return this.settings.muted;
  }

  get volume(): number {
    return this.settings.volume;
  }

  unlock(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
      this.applyVolume();
    }
    if (this.context.state === 'suspended') void this.context.resume();
    if (this.wantMusic && !this.musicTimer) this.startScheduler();
  }

  play(sound: SoundId): void {
    const { context, master } = this;
    if (!context || !master || this.settings.muted) return;
    const spec = SOUNDS[sound];
    const gain = spec.volume * gameConfig.audio.effectsGain;
    const start = context.currentTime;
    if (spec.slide) {
      const from = spec.notes[0] ?? 440;
      const to = spec.notes.at(-1) ?? from;
      this.tone(spec.wave, from, to, start, spec.step, gain);
      return;
    }
    spec.notes.forEach((frequency, i) => {
      const at = start + i * spec.step;
      this.tone(spec.wave, frequency, frequency, at, spec.step, gain);
    });
  }

  startMusic(): void {
    this.wantMusic = true;
    if (this.context && !this.musicTimer) this.startScheduler();
  }

  stopMusic(): void {
    this.wantMusic = false;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  toggleMute(): void {
    this.settings.muted = !this.settings.muted;
    this.applyVolume();
    this.save();
  }

  setVolume(volume: number): void {
    this.settings.volume = Math.min(1, Math.max(0, volume));
    this.applyVolume();
    this.save();
  }

  private startScheduler(): void {
    const context = this.context;
    if (!context) return;
    this.sequencers = MUSIC.map(
      (track) => new Sequencer(track.notes, MUSIC_BPM),
    );
    this.musicStart = context.currentTime + 0.05;
    this.scheduleMusic();
    this.musicTimer = setInterval(
      () => this.scheduleMusic(),
      SCHEDULE_INTERVAL_MS,
    );
  }

  /** Queues every note that starts within the lookahead window. */
  private scheduleMusic(): void {
    const context = this.context;
    if (!context) return;
    const horizon = context.currentTime + LOOKAHEAD_SECONDS - this.musicStart;
    MUSIC.forEach((track, i) => {
      const sequencer = this.sequencers[i];
      if (!sequencer) return;
      while (sequencer.nextStart < horizon) {
        const note = sequencer.next();
        if (note.frequency === null) continue;
        const gain = track.volume * gameConfig.audio.musicGain;
        // Slightly shorter than the note so repeated notes stay separate.
        const length = note.duration * 0.9;
        const at = this.musicStart + note.start;
        this.tone(track.wave, note.frequency, note.frequency, at, length, gain);
      }
    });
  }

  private tone(
    wave: Waveform,
    from: number,
    to: number,
    start: number,
    duration: number,
    gain: number,
  ): void {
    const { context, master } = this;
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== from) {
      oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    }
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(envelope).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  private applyVolume(): void {
    if (!this.master || !this.context) return;
    const level = this.settings.muted ? 0 : this.settings.volume;
    this.master.gain.setValueAtTime(level, this.context.currentTime);
  }

  private load(): AudioSettings {
    const defaults = { muted: false, volume: gameConfig.audio.defaultVolume };
    try {
      const raw = this.storage?.getItem(SETTINGS_KEY);
      if (!raw) return defaults;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return defaults;
      const { muted, volume } = parsed as Partial<AudioSettings>;
      return {
        muted: typeof muted === 'boolean' ? muted : defaults.muted,
        volume:
          typeof volume === 'number' && volume >= 0 && volume <= 1
            ? volume
            : defaults.volume,
      };
    } catch {
      return defaults;
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage can be full or blocked (private mode); settings then reset.
    }
  }
}
