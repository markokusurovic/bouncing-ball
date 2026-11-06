import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import type { AudioPlayer } from '../core/interfaces';

/**
 * Observer: turns game events into sounds and music. The engine never calls
 * the audio player itself.
 */
export function connectAudio(
  events: EventBus<GameEvents>,
  audio: AudioPlayer,
): void {
  events.on('ballLaunched', () => audio.play('launch'));
  events.on('paddleHit', () => audio.play('paddle'));
  events.on('brickHit', () => audio.play('metal'));
  events.on('brickDestroyed', () => audio.play('brick'));
  events.on('laserFired', () => audio.play('laser'));
  events.on('powerUpCollected', () => audio.play('powerUp'));
  events.on('extraLife', () => audio.play('extraLife'));
  events.on('ballLost', () => audio.play('lose'));
  events.on('levelCleared', () => audio.play('levelClear'));
  events.on('gameOver', () => audio.play('gameOver'));
  events.on('muteToggled', () => audio.toggleMute());
  events.on('stateChanged', ({ state }) => {
    if (state === 'playing') audio.startMusic();
    else audio.stopMusic();
  });
}
