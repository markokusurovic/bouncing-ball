# Game design spec

Loaded when working under `src/engine/`. Universal rules (tunables in `gameConfig.ts`, etc.) stay in the root `CLAUDE.md`.

- **Controls:** arrow keys or mouse move the paddle. `Space` or mouse click launches the ball and fires the laser. `P`/`Esc` pause, `M` mute.
- **Lives:** start with 3. Extra life every 10,000 points.
- **Scoring:** points per brick type; combo multiplier ×1 → ×5 for consecutive bricks without touching the paddle (reset on paddle hit); level-clear bonus plus bonus per remaining life.
- **Bricks** (level grid characters):

  | Char    | Brick              | Hits                   | Points            |
  | ------- | ------------------ | ---------------------- | ----------------- |
  | `1`–`4` | Normal (4 colors)  | 1                      | 50 / 60 / 70 / 80 |
  | `S`     | Silver             | 2–3 (grows with level) | 200               |
  | `X`     | Metal, unbreakable | ∞                      | –                 |
  | `.`     | Empty              |                        |                   |

- **Levels:** 10 levels as string grids in `src/engine/levels/data/level-NN.ts`. Ball speed rises slightly per level. After level 10, loop to level 1 with higher speed. A level is cleared when every breakable brick is gone.
- **Power-ups:** drop as falling capsules from destroyed bricks (~15% chance). Same power-up again resets its timer; different ones stack.

  | Power-up | Effect                                                                                      | Duration   |
  | -------- | ------------------------------------------------------------------------------------------- | ---------- |
  | Wide     | Paddle 1.5× wider                                                                           | 15 s       |
  | Multi    | Split into 3 balls; a life is lost only when the last ball is lost                          | until lost |
  | Slow     | Ball speed ×0.6                                                                             | 10 s       |
  | Laser    | Fire at most once per second; bullet flies straight up and hits the first brick in its path | 15 s       |

- **High scores:** top 10 in `localStorage` (initials, score, level reached), arcade-style 3-initials entry. Access only through the `HighScoreRepository` interface.
- **Audio:** Web Audio API only, no audio files. Synthesized chiptune sound effects plus a looping melody defined as note data. Mute and volume persisted in `localStorage`. Audio starts only after a user gesture (browser autoplay rules).
