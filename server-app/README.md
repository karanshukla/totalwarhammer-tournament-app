# TW Tournament — Server App

The Node.js/Express backend for the Total War: Warhammer Tournament App.

## Tech Stack

- **Node.js** (ESM, v24.15.0+) + **Express 5**
- **MongoDB** via **Mongoose 9**
- **express-session** — server-side sessions, backed by `connect-redis` when `REDIS_URL` is set, otherwise `connect-mongodb-session`
- **bcrypt** — password hashing
- **helmet**, **hpp**, **express-mongo-sanitize**, **express-rate-limit** — security hardening
- **csrf-csrf** — CSRF protection
- **Winston** — structured logging
- **Resend** — transactional email (password reset)
- **Redis** (optional) — session store via `connect-redis`
- **Node built-in test runner** — server-side tests

## Getting Started

### Prerequisites

- Node.js v24.15.0+ (see `.nvmrc`)
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- Redis (optional)

### Installation

From the repo root (recommended):

```bash
npm install          # installs all workspaces
npm run dev:server
```

Or directly from this directory:

```bash
npm install
npm run dev
```

The API runs at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in this directory. Required variables:

```env
PORT=3000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/twt
SESSION_SECRET=your-long-random-secret

# Required in production; the server refuses to start without it
CSRF_SECRET=another-long-random-secret

# Optional — Redis session store and Socket.IO adapter
REDIS_URL=redis://localhost:6379
USE_MONGO_SESSION=false

# Optional — Resend email for password resets
RESEND_API_KEY=re_xxxxxxxxxxxx

# Client URL — CORS origin and the base for password-reset links
CLIENT_URL=http://localhost:5173
```

See the root `CLAUDE.md` for the full list, including the optional Axiom
log-shipping variables.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart on changes) |
| `npm start` | Start without nodemon (production) |
| `npm test` | Run all tests with Node test runner |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run oxlint |
| `npm run lint:fix` | Run oxlint with auto-fix |

## API Overview

| Resource | Base path |
|---|---|
| Users | `/user` |
| Auth | `/auth` |
| Guest | `/guest` |
| Tournaments | `/tournament` |
| Matches | `/match` |

| Password reset | `/password-reset` |
| Stats | `/stats` |

Key match endpoints (all `PATCH`, not `POST`):
- `PATCH /match/:id/report` — report a match result (participant or creator)
- `PATCH /match/:id/resolve` — resolve a disputed match (creator only)
- `PATCH /match/:id/result` — record a result directly (creator only)
- `PATCH /match/:id/override` — override a completed match result (creator only)
- `PATCH /tournament/:id/description` — update tournament description (creator only, max 2000 chars)

## Project Structure

```
src/
├── domain/
│   └── models/          # Mongoose schemas (User, Tournament, Match)
├── infrastructure/
│   ├── services/        # AuthStateService, etc.
│   └── utils/           # logger, helpers
├── interfaces/
│   └── http/
│       ├── controllers/ # Route handlers
│       ├── middleware/  # Auth, rate limiting, validation
│       └── routes/      # Express routers
└── tests/               # Unit tests per controller/service
```
