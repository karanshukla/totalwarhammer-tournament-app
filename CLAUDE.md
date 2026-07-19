# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
npm install              # install all workspace dependencies
npm run dev              # run client (port 5173) + server (port 3000) concurrently
npm run dev:client       # client only
npm run dev:server       # server only (nodemon)
```

### Testing

```bash
npm run test --workspace=client-app        # Vitest (one-off)
npm run test:watch --workspace=client-app  # Vitest watch mode
npm run test --workspace=server-app        # Node test runner
npm run test:watch --workspace=server-app  # Node test runner watch mode
```

To run a single test file (server):
```bash
cd server-app && node --test src/tests/authentication-controller.test.js
```

To run a single test file (client):
```bash
cd client-app && npx vitest run src/tests/SomeComponent.test.tsx
```

### Lint & Format

```bash
npm run lint             # lint all workspaces
npm run lint:fix         # auto-fix lint issues
npm run format           # format all workspaces (Prettier)
npm run format:check     # check formatting without writing
```

### Docker

```bash
docker-compose up --build   # full stack (client, server, MongoDB, Redis, Caddy)
docker-compose down
```

## Code comments

Don't add comments above functions or inline unless the WHY is genuinely non-obvious (a hidden constraint, a subtle invariant, a workaround for a specific bug). Well-named identifiers should make the WHAT self-evident. Before reaching for a comment, check whether the explanation can instead be expressed through abstraction or encapsulation — e.g. business logic embedded in a controller should move to a self-commenting, domain-named method in `domain/` or `infrastructure/` rather than being explained in a comment. Favor human-readable, domain-driven names and logical flow over prose explanations, while keeping code legible to agents working in this repo.

## Architecture

This is an **npm workspace monorepo** with two packages: `client-app/` (React) and `server-app/` (Express). Root scripts delegate to both via `--workspaces`.

### Client (`client-app/`)

- **React 19 + Vite 6 + TypeScript**, Chakra UI v3 for all UI components
- **Routing**: React Router v7 with lazy-loaded pages
- **State**: Two Zustand stores — `userStore` (auth session, persisted to localStorage) and `tournamentStore` (active tournament + match data)
- **HTTP**: All requests go through `src/core/api/httpClient.ts`, which manages CSRF token fetching/caching and session validation. Do not bypass this with raw fetch/axios.
- **Forms**: React Hook Form + Zod validation everywhere
- **Path alias**: `@/*` maps to `src/*`
- **Code structure**: Feature-based under `src/features/`; shared UI in `src/shared/ui/`

### Design System (`client-app/src/shared/ui/theme.ts`)

The Chakra UI v3 theme is defined in a single file — **not** a `theme/` directory. It exports `system` (used in `Provider.tsx`).

**Colour palettes defined:** `crimson` (brand/primary), `brass` (gold/champion), `verdigris` (info/active), `ink` (neutrals).

#### Semantic tokens — always use these, never raw hex

| Category | Tokens |
|----------|--------|
| Backgrounds | `bg.canvas`, `bg.surface`, `bg.subtle`, `bg.muted`, `bg.elevated`, `bg.panel` |
| Borders | `border` (default), `border.muted`, `border.subtle`, `border.emphasized` |
| Text | `fg.primary`, `fg.secondary`, `fg.muted` |
| Brand (crimson) | `brand.solid`, `brand.hover`, `brand.active`, `brand.text`, `brand.subtle`, `brand.border`, `brand.fg` |
| Gold (brass) | `gold.solid`, `gold.hover`, `gold.text`, `gold.subtle`, `gold.border`, `gold.fg` |
| Info (verdigris) | `info.solid`, `info.hover`, `info.text`, `info.subtle`, `info.border`, `info.fg` |
| Match status | `status.win`, `status.win.subtle`, `status.win.border` |
| | `status.loss`, `status.loss.subtle`, `status.loss.border` |
| | `status.draw`, `status.draw.subtle`, `status.draw.border` |
| | `status.live`, `status.live.subtle` |
| | `status.pending`, `status.pending.subtle`, `status.pending.border` |

#### Typography

| Font | Token | Use |
|------|-------|-----|
| Cinzel | `fontFamily="heading"` | Headings, tournament names |
| Oswald | `fontFamily="cond"` | Labels, badges, nav |
| Barlow | `fontFamily="body"` | Body text |
| JetBrains Mono | `fontFamily="mono"` | Scores, IDs, codes |

#### Buttons & Badges

Chakra v3 uses `colorPalette` + `variant` — never `colorScheme` (v2 API), and there is no custom `buttonRecipe` or `badgeRecipe` in this codebase.

**Buttons** — `colorPalette` maps to intent:
- `colorPalette="crimson" variant="solid"` — primary CTA (Join, Register, Submit)
- `colorPalette="brass" variant="solid"` — champion actions (Seed Bracket)
- `colorPalette="verdigris" variant="outline"` — view/active actions (Submit Result)
- `colorPalette="ink" variant="outline"` — secondary/neutral actions (Cancel, Override)
- `variant="ghost"` — icon-only or inline controls

**Badges** — use semantic token `bg`/`color`/`borderColor` props directly, or `colorPalette`:
- Status badges in `MatchCard` use inline semantic tokens (`bg="status.win.subtle"`, `color="status.win"`, etc.) for fine-grained control

#### Chakra UI v3 compound components

Tooltip and Popover use the compound-component (Ark UI) API — not the v2 single-component API:

```tsx
import { Popover, Tooltip } from "@chakra-ui/react"

// Popover
<Popover.Root>
  <Popover.Trigger asChild><Button>click</Button></Popover.Trigger>
  <Popover.Positioner>
    <Popover.Content>
      <Popover.Arrow><Popover.ArrowTip /></Popover.Arrow>
      <Popover.Body>content</Popover.Body>
    </Popover.Content>
  </Popover.Positioner>
</Popover.Root>

// Tooltip
<Tooltip.Root>
  <Tooltip.Trigger asChild><span>hover</span></Tooltip.Trigger>
  <Tooltip.Positioner>
    <Tooltip.Content><Tooltip.Arrow />text</Tooltip.Content>
  </Tooltip.Positioner>
</Tooltip.Root>
```

#### Rules
- Never use a raw hex value for a UI colour — map it to a semantic token first
- Never use `colorScheme` prop (Chakra v2 API)
- Faction colours in `shared/constants/factions.ts` are raw hex by design — do not tokenise them

### Server (`server-app/`)

- **Node.js 24+ ESM**, Express 4, Mongoose 8, all files use `.js` extension with ES6 `import`/`export`
- **Architecture layers**:
  - `domain/` — Mongoose schemas + core tournament bracket logic (`tournament-service.js`)
  - `infrastructure/` — DB connection, session store, Redis, Socket.IO, email, logger, rate limiters
  - `interfaces/http/` — controllers, routes, middleware
- **Middleware order matters** (see `app.js`): security headers → CORS → session/Passport → CSRF check → body parser → rate limiters → routes
- **CSRF**: All mutating requests require a CSRF token. The client fetches it from `GET /auth/csrf-token`; the server validates via `csrf-csrf`.
- **Auth**: Session-based. Guest users get a UUID identity stored in session. Registered users use bcrypt-hashed passwords. A PKCE-like flow exists for OAuth-style registration.
- **Real-time**: Socket.IO with Redis pub/sub adapter (falls back to MongoDB adapter). Match result changes broadcast to all clients watching a tournament.
- **Match result flow**: Both participants report independently → if consensus, auto-complete + broadcast; if conflict, status becomes `disputed`; tournament creator can resolve or override. Overrides are stored as an array of `resultOverrides` on each match document (`{ newWinnerId, previousWinnerId, overriddenBy, reason, overriddenAt }`); the reason is surfaced on the `MatchCard` via a Popover.
- **Environment config**: `infrastructure/config/env-loader.js` loads `.env` from the repo root; `infrastructure/config/env.js` exports values per `NODE_ENV`. Three environment profiles: `development.js`, `production.js`, `test.js`.

### Key environment variables

```env
MONGO_URI=                # MongoDB connection string
REDIS_URL=                # Optional; enables Redis for sessions + Socket.IO
USE_MONGO_SESSION=false   # true = MongoDB session store instead of Redis
SESSION_SECRET=
CSRF_SECRET=
JWT_SECRET=
RESEND_API_KEY=           # Email delivery for password reset
CLIENT_URL=               # CORS allowed origin
PORT=3000
NODE_ENV=development
AXIOM_TOKEN=              # Optional; Axiom API token — enables structured log shipping
AXIOM_DATASET=            # Optional; Axiom dataset name (required when AXIOM_TOKEN is set)
```

### Logging

The server uses **Winston** (`server-app/src/infrastructure/utils/logger.js`) with console and file transports. Log level is `debug` in development and `info` in production.

**Axiom integration** is opt-in: set both `AXIOM_TOKEN` and `AXIOM_DATASET` env vars to enable structured log shipping via `@axiomhq/winston`. When neither is set, the logger behaves exactly as before.

Log levels used across the codebase:
- `error` — unexpected failures (DB errors, session errors, uncaught exceptions)
- `warn` — security-relevant rejections (failed logins, auth 401s, disputes, overrides)
- `info` — key business events (login, logout, registration, tournament lifecycle, match results)
- `debug` — low-noise internal state (PKCE code generation, session recovery details)

### CI

GitHub Actions workflows in `.github/workflows/`:
- `clientTests.yml` — Vitest on client changes
- `serverTests.yml` — Node test runner with a MongoDB service container
- `authBoundaries.yml` — auth/session boundary integration tests ("Skaven Underway Tests")
- `coverage.yml` — test coverage reporting
- `codacy.yml` — Codacy security scan
- `zapScan.yml` — OWASP ZAP API security scan
- `claude-code-review.yml` — automated review via Claude
- `claude.yml` — Claude Code agent integration
