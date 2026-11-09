# Project Context: Bouncing Ball

An original Arkanoid-style brick-breaker game with a retro pixel-art look.

- **Rendering:** native HTML5 Canvas API inside a single React component (`GameCanvas`), driven by a native `requestAnimationFrame` loop.
- **No game engines** (no Phaser, Pixi, etc.) and **no DOM elements for game entities**. React and Tailwind are only for the shell, menus and HUD overlays.
- **Issue tracking:** YouTrack Cloud via MCP (`.mcp.json`, git-ignored), Kanban board **Bouncing Ball**.
- **Repo:** GitHub `markokusurovic/bouncing-ball` (public), managed with the `gh` CLI.
- **Hosting:** GitHub Pages at https://markokusurovic.github.io/bouncing-ball/

## How to work with me (the user)

- Present a plan first. Implement only after the plan is agreed.
- Work in the agreed PR-sized steps. Keep PRs few and clear. Each PR leaves the game playable and has its own tests.
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

The full spec (controls, lives, scoring, bricks, levels, power-ups, high scores, audio) is in `src/engine/CLAUDE.md`. Always-applicable rules:

- **All tunable numbers** (durations, multipliers, drop chance, speeds, lives, points, cooldowns) live in **`src/engine/config/gameConfig.ts`**. Never hard-code them in logic.
- **High scores:** access only through the `HighScoreRepository` interface.
- **Audio:** Web Audio API only, no audio files. Audio starts only after a user gesture.

## Commands

- **Before pushing:** `npm run typecheck && npm run lint && npm run format:check && npm run coverage && npm run build`

## Code quality

- TypeScript strict mode. Explicit types for public methods, React props and hooks. No `any`.
- Linting with **oxlint**, not ESLint (typescript-eslint doesn't support TypeScript 7).
- Tests: Vitest. Engine logic (physics, collisions, scoring, power-ups, level parsing, state transitions) must have unit tests. Use fakes for injected interfaces, not real canvas/audio.

## Git and CI

- `main` is the default branch. Work on `feature/<short-name>` branches, one per PR.
- Never merge a PR with a failing check.
- Link the YouTrack issue ID in the PR title or description.
- The repo is **public**: never commit secrets, tokens or `.mcp.json`.

## Deployment (GitHub Pages)

- `deploy.yml` deploys on every push to `main`. Pages source is set to "GitHub Actions" in repo settings.
- The site is served from a subpath, so `vite.config.ts` must set `base: '/bouncing-ball/'`. Never use absolute asset paths like `/foo.png`; import assets or use `import.meta.env.BASE_URL`.
- After a merge to `main`, check the deploy run and open the live URL to confirm the game loads.
