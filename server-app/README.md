# TW Tournament — Server App

The Node.js/Express backend for the Total War: Warhammer Tournament App.

## Tech Stack

- **Node.js** (ESM, v18+) + **Express 4**
- **MongoDB** via **Mongoose 8**
- **express-session** + **connect-mongodb-session** — server-side sessions
- **bcrypt** — password hashing
- **helmet**, **hpp**, **express-mongo-sanitize**, **express-rate-limit** — security hardening
- **csrf-csrf** — CSRF protection
- **Winston** — structured logging
- **Resend** — transactional email (password reset)
- **Redis** (optional) — session store via `connect-redis`
- **Node built-in test runner** — server-side tests

## Getting Started

### Prerequisites

- Node.js v18+
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
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/twt
SESSION_SECRET=your-long-random-secret

# Optional — Redis session store
REDIS_URL=redis://localhost:6379

# Optional — Resend email for password resets
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# Client URL for CORS
CLIENT_URL=http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart on changes) |
| `npm start` | Start without nodemon (production) |
| `npm test` | Run all tests with Node test runner |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |

## API Overview

| Resource | Base path |
|---|---|
| Users | `/user` |
| Auth | `/auth` |
| Guest | `/guest` |
| Tournaments | `/tournament` |
| Matches | `/match` |

Key match endpoints:
- `POST /match/:id/report` — report a match result (participant or creator)
- `POST /match/:id/resolve` — resolve a disputed match (creator only)
- `POST /match/:id/override` — override a completed match result (creator only)
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