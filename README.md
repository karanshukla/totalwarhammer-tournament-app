# Total War: Warhammer Tournament App

[![Client Tests](https://github.com/karanshukla/totalwarhammer-tournament-app/actions/workflows/clientTests.yml/badge.svg)](https://github.com/karanshukla/totalwarhammer-tournament-app/actions/workflows/clientTests.yml)
[![Server Tests](https://github.com/karanshukla/totalwarhammer-tournament-app/actions/workflows/serverTests.yml/badge.svg)](https://github.com/karanshukla/totalwarhammer-tournament-app/actions/workflows/serverTests.yml)
[![Skaven Underway Test Yes Yes](https://github.com/karanshukla/totalwarhammer-tournament-app/actions/workflows/authBoundaries.yml/badge.svg)](https://github.com/karanshukla/totalwarhammer-tournament-app/actions/workflows/authBoundaries.yml)
[![Coverage Status](https://coveralls.io/repos/github/karanshukla/totalwarhammer-tournament-app/badge.svg?branch=main)](https://coveralls.io/github/karanshukla/totalwarhammer-tournament-app?branch=main)
[![OWASP ZAP Security Scan](https://github.com/karanshukla/totalwarhammer-tournament-app/actions/workflows/zapScan.yml/badge.svg)](https://github.com/karanshukla/totalwarhammer-tournament-app/actions/workflows/zapScan.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A full-stack web app for organizing and running competitive Total War: Warhammer tournaments. Supports multiple bracket formats, live bracket tracking, match dispute resolution, and guest participation - no account required to play.

<img width="2482" height="1710" alt="Tournament bracket view" src="https://github.com/user-attachments/assets/7b6accde-847f-41ca-93cd-733d67624268" />

<img width="2062" height="1576" alt="Tournament creation form" src="https://github.com/user-attachments/assets/6f940c66-a7e7-4e41-8a1e-ef5cb3d44330" />

<img width="1176" height="849" alt="image" src="https://github.com/user-attachments/assets/4fe9d0a9-f109-44ac-9fbf-25c9a897a89d" />

<img width="2112" height="1620" alt="Mobile layout with bottom navigation" src="https://github.com/user-attachments/assets/7cd700ad-8d9e-4369-83cc-68341adc2865" />

## Features

- **Tournament formats** - Single Elimination, Double Elimination, Round Robin, Swiss System (Blossom algorithm for optimal pairing via [tournament-pairings](https://github.com/slashinfty/tournament-pairings))
- **Guest users** - join and participate in tournaments without registering
- **Match result reporting** - both participants report independently; consensus auto-completes, conflicts raise a disputed state
- **Dispute resolution** - tournament creators can resolve disputed matches or override completed results
- **Live updates** - bracket and match state broadcast in real-time via Socket.IO to all connected clients
- **Markdown descriptions** - tournament descriptions support full Markdown rendering (2000 char limit)
- **Mobile portrait support** - responsive layout with bottom navigation bar on mobile
- **Dark/light mode** - theme toggle persisted per session

## How Match Reporting Works

The match flow uses a dual-report system so neither player can unilaterally set a result:

1. Both participants independently report who won
2. **Agree** → match auto-completes and the bracket advances
3. **Disagree** → match enters a `disputed` state
4. The tournament creator resolves the dispute or overrides any result

State changes broadcast live to all clients watching the tournament.

## Repository Structure

This is an npm workspace monorepo with two packages:

```
totalwarhammer-tournament-app/
├── client-app/      # React + Vite + TypeScript frontend
├── server-app/      # Node.js + Express + MongoDB backend
└── package.json     # Root workspace - runs both together
```

## Quick Start

### Option 1: Docker (easiest)

```bash
git clone https://github.com/karanshukla/totalwarhammer-tournament-app.git
cd totalwarhammer-tournament-app
docker-compose up --build
```

This starts the client, server, MongoDB, Redis, and Caddy reverse proxy in one command.

### Option 2: Local dev

**Prerequisites**

- Node.js v22+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- Redis (optional - used for session caching and Socket.IO pub/sub)

**Install**

```bash
git clone https://github.com/karanshukla/totalwarhammer-tournament-app.git
cd totalwarhammer-tournament-app
npm install
```

**Environment**

```bash
cp server-app/.env.example server-app/.env
# Set MONGO_URI, SESSION_SECRET, and CSRF_SECRET at minimum
```

**Run**

```bash
npm run dev        # client (port 5173) + server (port 3000) concurrently
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Chakra UI v3 |
| Routing | React Router v7 |
| State | Zustand |
| Backend | Node.js, Express 4 |
| Database | MongoDB via Mongoose |
| Sessions | express-session + connect-mongodb-session |
| Real-time | Socket.IO with Redis pub/sub |
| Auth | Custom session-based auth with PKCE |
| Email | Resend |
| Logging | Winston + optional Axiom |
| Testing | Vitest (client), Node test runner (server) |
| Swiss Pairing | [tournament-pairings](https://github.com/slashinfty/tournament-pairings) - Blossom algorithm |

## Authentication

Session-based auth with a PKCE-inspired flow. Guest users get a UUID identity stored in their session and can join any tournament without registering. Registered users authenticate with email/password and get a persistent session with email-based password reset.

## CI

| Workflow | Trigger |
|---|---|
| Client Tests + Coverage | Push/PR to `main` touching `client-app/` |
| Server Tests + Coverage | Push/PR to `main` touching `server-app/` |
| OWASP ZAP Security Scan | Push to `main` |
| Codacy Security Scan | Push/PR to `main`, weekly |
| Sync main → dev | After merge to `main` |

## Contributing

Contributions are welcome. To get started:

1. Fork the repo and create a branch from `main`
2. Make your changes with tests where applicable (`npm run test:client` / `npm run test:server`)
3. Run `npm run lint` and `npm run format` before submitting
4. Open a pull request - CI and automated code review run automatically

For larger changes, open an issue first to align on approach.

## Acknowledgements

- [Creative Assembly](https://www.creative-assembly.com/) for the Total War: Warhammer series
- [slashinfty/tournament-pairings](https://github.com/slashinfty/tournament-pairings) for the Swiss pairing Blossom implementation
