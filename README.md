# Bouncing Ball

A retro pixel-art brick-breaker for the browser, built with React, TypeScript and the Canvas API.

**▶ Play it here: https://markokusurovic.github.io/bouncing-ball/**

## How to play

| Action                  | Keyboard                                       | Mouse        |
| ----------------------- | ---------------------------------------------- | ------------ |
| Move the paddle         | `←` `→`                                        | move         |
| Launch ball, fire laser | `Space` or `Enter`                             | click        |
| Pause / resume          | `P` or `Esc`                                   |              |
| Mute                    | `M`                                            |              |
| High-score initials     | `↑` `↓` letter, `Space` next, `Backspace` back | click = next |

- You start with **3 lives** and get an extra one every **10,000 points**.
- Break bricks in a row without touching the paddle to build a **combo up to ×5**.
- Clearing a level gives a bonus plus a bonus for every life left.
- **10 levels.** After level 10 they start again, a bit faster.

| Brick   | Hits        | Points            |
| ------- | ----------- | ----------------- |
| Colored | 1           | 50 / 60 / 70 / 80 |
| Silver  | 2–3         | 200               |
| Metal   | unbreakable | –                 |

Some bricks drop a falling capsule. Catch it with the paddle:

| Capsule | Power-up | Effect                                                           |
| ------- | -------- | ---------------------------------------------------------------- |
| **W**   | Wide     | Paddle 1.5× wider for 15 s                                       |
| **M**   | Multi    | Ball splits into 3; you lose a life only when the last one falls |
| **S**   | Slow     | Ball speed ×0.6 for 10 s                                         |
| **L**   | Laser    | Fire straight up, once per second, for 15 s                      |

The top 10 scores are saved in your browser.

## Development

Requires Node 22.12 or later.

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run coverage   # tests with coverage thresholds
npm run typecheck && npm run lint && npm run format:check
npm run build      # production build into dist/
```

Every push to `main` is checked by CI and deployed to GitHub Pages.

## How it's built

- **Engine** (`src/engine/`): pure TypeScript with no React or DOM, so it is unit-tested in Node. It gets the renderer, input, audio, random numbers and high-score storage injected as interfaces.
- **Game loop**: `requestAnimationFrame` with a fixed 120 updates per second; the ball moves in small sub-steps so it never tunnels through bricks or the paddle.
- **Patterns**: State (screens), Strategy (power-ups), Factory (bricks from level text), Observer (typed event bus feeding score, sound and HUD), Command (input), Object pool (bullets, capsules, particles).
- **Graphics**: a 320×240 canvas scaled up by whole numbers; sprites are text pixel maps using one shared palette.
- **Sound**: synthesized with the Web Audio API, with no audio files; the music is note data.
- **UI**: React and Tailwind draw only the HUD and screen overlays on top of the canvas.
