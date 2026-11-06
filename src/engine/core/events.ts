/** Everything the game announces. Score, audio and HUD subscribe to these. */
export type GameEvents = {
  ballLaunched: { x: number };
  paddleHit: { x: number };
  ballLost: { x: number };
};
