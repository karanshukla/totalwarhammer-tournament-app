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
npm run test:client              # Vitest (one-off)
npm run test:client:watch        # Vitest watch mode
npm run test:server              # Node test runner with coverage
npm run test:server:watch        # Node test runner watch mode
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
- **Match result flow**: Both participants report independently → if consensus, auto-complete + broadcast; if conflict, status becomes `disputed`; tournament creator can resolve or override.
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
- `sync-main-to-dev.yml` — auto-merges main → dev after push; opens PR on conflict
- `claude-code-review.yml` — automated review via Claude
