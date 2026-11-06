# Project Context: Bouncing Ball

An original Arkanoid-style brick-breaker game with a retro pixel-art look.

- **Stack:** React 19, TypeScript 7 (strict), Tailwind CSS v4 (via `@tailwindcss/vite`, no `tailwind.config.js`), Vite 8. Node 22.12 or later.
- **Rendering:** native HTML5 Canvas API inside a single React component (`GameCanvas`), driven by a native `requestAnimationFrame` loop.
- **No game engines** (no Phaser, Pixi, etc.) and **no DOM elements for game entities**. React and Tailwind are only for the shell, menus and HUD overlays.
- **Issue tracking:** YouTrack Cloud via MCP (`.mcp.json`, git-ignored), Kanban board **Bouncing Ball**.
- **Repo:** GitHub `markokusurovic/bouncing-ball` (public), managed with the `gh` CLI.
- **Hosting:** GitHub Pages at https://markokusurovic.github.io/bouncing-ball/

## How to work with me (the user)

- Present a plan first. Implement only after the plan is agreed.
- Work in the agreed PR-sized steps (see the roadmap below). Keep PRs few and clear. Each PR leaves the game playable and has its own tests.
- Keep token and limit usage low. Don't re-read files without need, don't rewrite whole files when a small edit works, and don't add speculative features.
- Don't add new dependencies without asking.
- Explain React-specific parts (hooks, effects, refs) when you add them.

## Architecture

The key rule: **the game engine (`src/engine/`) is pure TypeScript with no React or DOM imports.** It talks to the outside world only through injected interfaces (renderer, audio, storage, input source). This keeps it unit-testable in Node.

Follow **SOLID** and use these patterns:

| Pattern              | Where                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| State                | Game screens: `Menu → Playing ⇄ Paused → LevelComplete → GameOver → HighScoreEntry` (`engine/states/`)                                       |
| Strategy             | Each power-up implements `PowerUp { apply(); remove(); }` (`engine/powerups/`)                                                               |
| Factory              | `BrickFactory` maps grid characters to bricks; `LevelLoader` builds levels                                                                   |
| Observer             | `EventBus` with typed events (`brickDestroyed`, `lifeLost`, ...). Score, audio and React HUD subscribe; the engine never calls them directly |
| Command              | Keyboard and mouse input mapped to commands (`MoveLeft`, `MoveRight`, `MoveTo`, `Fire`, `Pause`)                                             |
| Object pool          | Bullets and particles are reused, never allocated per frame                                                                                  |
| Dependency injection | `Game` (composition root) receives `Renderer`, `AudioPlayer`, `HighScoreRepository`, `InputSource` interfaces                                |

### Game loop and physics

- `requestAnimationFrame` with a **fixed timestep of 120 updates/s** and an accumulator; rendering is decoupled from updates. Clamp large frame deltas (e.g. tab switching) to avoid a spiral of death.
- Collisions must not tunnel: use swept/sub-stepped ball movement against bricks, paddle and walls.
- Paddle bounce angle depends on hit position. Enforce a minimum vertical angle so the ball can't loop almost horizontally.
- Never use `Math.random()` directly in engine logic; inject an RNG so tests are deterministic.

### Rendering and pixel art

- Draw to an internal **320×240** canvas, scaled up with `imageSmoothingEnabled = false` and integer scaling where possible.
- Sprites are **text pixel maps with palette keys** (`render/sprites/`), not image files.
- **All colors live in `src/theme/palette.ts`.** Never hard-code a color anywhere else.

## Game design

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

- **All tunable numbers** (durations, multipliers, drop chance, speeds, lives, points, cooldowns) live in **`src/engine/config/gameConfig.ts`**. Never hard-code them in logic.
- **High scores:** top 10 in `localStorage` (initials, score, level reached), arcade-style 3-initials entry. Access only through the `HighScoreRepository` interface.
- **Audio:** Web Audio API only, no audio files. Synthesized chiptune sound effects plus a looping melody defined as note data. Mute and volume persisted in `localStorage`. Audio starts only after a user gesture (browser autoplay rules).

## Folder structure

```
src/
├── main.tsx, App.tsx
├── ui/            # React only: GameCanvas, HUD, menus, HighScoreTable
├── engine/        # Pure TS, no React/DOM
│   ├── config/    # gameConfig.ts (all tunables)
│   ├── core/      # Game, GameLoop, EventBus, interfaces
│   ├── states/    # State pattern
│   ├── entities/  # Ball, Paddle, Brick, Bullet, PowerUpCapsule
│   ├── physics/   # vectors, collision
│   ├── powerups/  # Strategy classes, PowerUpManager
│   ├── input/     # commands, keyboard/mouse mapping
│   ├── levels/    # LevelLoader, BrickFactory, data/
│   ├── scoring/   # ScoreManager, combo
│   └── audio/     # synth SFX, music sequencer
├── render/        # CanvasRenderer, sprites/
├── theme/         # palette.ts
└── storage/       # LocalStorageHighScoreRepository
tests/             # mirrors src/ structure
```

## Commands

- `npm run dev`: dev server at http://localhost:5173
- `npm test`: Vitest. `npm run coverage` adds coverage with thresholds from `vite.config.ts`
- `npm run typecheck`, `npm run lint` (oxlint, `--deny-warnings`), `npm run format` / `format:check` (Prettier)
- `npm run build`: production build into `dist/`
- **Before pushing:** `npm run typecheck && npm run lint && npm run format:check && npm run coverage && npm run build`

## Code quality

- TypeScript strict mode. Explicit types for public methods, React props and hooks. No `any`.
- Linting with **oxlint**, not ESLint (typescript-eslint doesn't support TypeScript 7). `react/rules-of-hooks` and `react/exhaustive-deps` are errors.
- Prettier with single quotes and `prettier-plugin-tailwindcss`.
- Tests: Vitest. Engine logic (physics, collisions, scoring, power-ups, level parsing, state transitions) must have unit tests. Use fakes for injected interfaces, not real canvas/audio.

## Git and CI

- `main` is the default branch. Work on `feature/<short-name>` branches, one per PR.
- GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, format check, tests with coverage and build on pushes and PRs.
- Never merge a PR with a failing check.
- Link the YouTrack issue ID in the PR title or description.
- The repo is **public**: never commit secrets, tokens or `.mcp.json`.

## Deployment (GitHub Pages)

- `.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on every push to `main`, using the official `actions/upload-pages-artifact` and `actions/deploy-pages` actions. Pages source is set to "GitHub Actions" in repo settings.
- The site is served from a subpath, so `vite.config.ts` must set `base: '/bouncing-ball/'`. Never use absolute asset paths like `/foo.png`; import assets or use `import.meta.env.BASE_URL`.
- After a merge to `main`, check the deploy run and open the live URL to confirm the game loads.

## Roadmap (one PR each)

1. Project setup: Vite, React, TS, Tailwind, Vitest, oxlint, Prettier, CI, GitHub Pages deploy, empty canvas live online
2. Core engine: game loop, paddle, ball, walls, collisions, input. A ball you can bounce
3. Bricks and levels: level loader, brick types, all 10 levels, lives, score and combo
4. Power-ups: Wide, Multi, Slow, Laser, falling capsules
5. Polish: pixel-art sprites, particles, state screens, sound and music
6. High scores and release: table, initials entry, README with live link, final release
