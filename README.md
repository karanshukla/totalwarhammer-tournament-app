# Total War: Warhammer Tournament App

A full-stack web application for organizing and managing tournaments for the Total War: Warhammer game series. Supports registered and guest users, multiple tournament formats, match result reporting, dispute resolution, and live bracket tracking.

## Features

- **Tournament formats** — Single Elimination, Double Elimination, Round Robin, Swiss System
- **Guest users** — join and participate in tournaments without registering
- **Match result reporting** — participants report results; consensus auto-completes, conflicts raise a disputed state
- **Dispute resolution** — tournament creators can resolve disputed matches or override completed results
- **Markdown descriptions** — tournament descriptions support full Markdown rendering (2000 char limit)
- **Live updates** — tournament and match state polls automatically while active
- **Mobile portrait support** — responsive layout with bottom navigation bar on mobile
- **Dark/light mode** — theme toggle persisted per session

## Repository Structure

This is an npm workspace monorepo with two packages:

```
totalwarhammer-tournament-app/
├── client-app/      # React + Vite + TypeScript frontend
├── server-app/      # Node.js + Express + MongoDB backend
└── package.json     # Root workspace — runs both together
```

## Quick Start

### Prerequisites

- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- Redis (optional — used for session caching)

### Installation

```bash
# Clone and install all workspaces
git clone https://github.com/karanshukla/totalwarhammer-tournament-app.git
cd totalwarhammer-tournament-app
npm install
```

### Environment Setup

Copy and configure the server environment file:

```bash
cp server-app/.env.example server-app/.env
# Edit server-app/.env with your MongoDB URI, session secret, etc.
```

### Running Locally

```bash
# Start both client and server together
npm run dev

# Or individually
npm run dev:client
npm run dev:server
```

- Client: `http://localhost:5173`
- Server API: `http://localhost:3000`

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Chakra UI v3 |
| Routing | React Router v7 |
| State | Zustand |
| Backend | Node.js, Express 4 |
| Database | MongoDB via Mongoose |
| Sessions | express-session + connect-mongodb-session |
| Auth | Custom session-based auth with PKCE |
| Email | Resend |
| Logging | Winston |
| Testing | Vitest (client), Node test runner (server) |

## Authentication

The app uses a custom session-based authentication system inspired by OAuth2/PKCE principles. Guest users receive a UUID-based identity stored in their session and can participate in tournaments without registering. Registered users authenticate with email/password and receive a persistent session.

## CI

GitHub Actions workflows run client and server tests on push. A separate workflow automatically merges `main` back into `dev` after a successful merge, or opens a PR if there are conflicts.

## Acknowledgements

- [Creative Assembly](https://www.creative-assembly.com/) for the Total War: Warhammer series
