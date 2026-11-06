import { describe, expect, it } from 'vitest';
import {
  MUSIC,
  noteFrequency,
  parseNotes,
  Sequencer,
  totalBeats,
} from '../../../src/engine/audio/music';
import { connectAudio } from '../../../src/engine/audio/connectAudio';
import { SOUNDS } from '../../../src/engine/audio/sounds';
import { EventBus } from '../../../src/engine/core/EventBus';
import type { GameEvents } from '../../../src/engine/core/events';
import { FakeAudio } from '../../fakes';

describe('noteFrequency', () => {
  it('converts note names to Hz', () => {
    expect(noteFrequency('A4')).toBe(440);
    expect(noteFrequency('A5')).toBe(880);
    expect(noteFrequency('C4')).toBeCloseTo(261.63, 2);
    expect(noteFrequency('C#4')).toBeCloseTo(noteFrequency('Db4'));
    expect(() => noteFrequency('H2')).toThrow();
  });
});

describe('parseNotes', () => {
  it('reads notes and rests with lengths in beats', () => {
    expect(parseNotes(' A4:0.5  -:1 ')).toEqual([
      { frequency: 440, beats: 0.5 },
      { frequency: null, beats: 1 },
    ]);
    expect(() => parseNotes('A4')).toThrow('length');
  });

  it('keeps all music tracks the same length so they loop together', () => {
    const lengths = MUSIC.map((track) => totalBeats(track.notes));
    expect(new Set(lengths).size).toBe(1);
    expect(lengths[0]).toBe(32);
  });
});

describe('Sequencer', () => {
  it('schedules notes back to back and loops', () => {
    const sequencer = new Sequencer(parseNotes('A4:1 -:0.5'), 120);
    expect(sequencer.next()).toEqual({
      frequency: 440,
      start: 0,
      duration: 0.5,
    });
    expect(sequencer.next()).toEqual({
      frequency: null,
      start: 0.5,
      duration: 0.25,
    });
    expect(sequencer.nextStart).toBe(0.75);
    expect(sequencer.next()).toMatchObject({ frequency: 440, start: 0.75 });
    expect(() => new Sequencer([], 120)).toThrow();
  });
});

describe('sounds', () => {
  it('are all audible', () => {
    for (const sound of Object.values(SOUNDS)) {
      expect(sound.notes.length).toBeGreaterThan(0);
      expect(sound.step).toBeGreaterThan(0);
      expect(sound.volume).toBeGreaterThan(0);
    }
  });
});

describe('connectAudio', () => {
  it('turns game events into sounds and music', () => {
    const events = new EventBus<GameEvents>();
    const audio = new FakeAudio();
    connectAudio(events, audio);
    events.emit('ballLaunched', { x: 0 });
    events.emit('paddleHit', { x: 0 });
    events.emit('brickHit', { x: 0, y: 0 });
    events.emit('brickDestroyed', { x: 0, y: 0, points: 50, color: 'brick1' });
    events.emit('laserFired', { x: 0 });
    events.emit('powerUpCollected', { type: 'wide' });
    events.emit('extraLife', { score: 0 });
    events.emit('ballLost', { x: 0 });
    events.emit('levelCleared', { level: 1, lives: 1 });
    events.emit('gameOver', { score: 0, level: 1 });
    events.emit('muteToggled', {});
    events.emit('stateChanged', { state: 'playing' });
    events.emit('stateChanged', { state: 'paused' });
    expect(audio.calls).toEqual([
      'launch',
      'paddle',
      'metal',
      'brick',
      'laser',
      'powerUp',
      'extraLife',
      'lose',
      'levelClear',
      'gameOver',
      'mute',
      'music on',
      'music off',
    ]);
  });
});
