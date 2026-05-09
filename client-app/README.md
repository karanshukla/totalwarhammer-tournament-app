# TW Tournament — Client App

The React frontend for the Total War: Warhammer Tournament App.

## Tech Stack

- **React 19** with TypeScript
- **Vite 6** — build tool and dev server
- **Chakra UI v3** — component library and theming
- **React Router v7** — client-side routing
- **Zustand** — global auth/user state
- **react-markdown** — Markdown rendering in tournament descriptions
- **Vitest** + **@testing-library/react** — unit and component tests

## Getting Started

From the repo root (recommended):

```bash
npm run dev:client
```

Or directly from this directory:

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and expects the backend API at `http://localhost:3000`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest test suite |

## Project Structure

```
src/
├── core/           # API client, config
├── features/       # Feature modules (tournaments, matches, auth, etc.)
│   ├── authentication/
│   ├── matches/
│   ├── tournaments/
│   ├── account/
│   ├── statistics/
│   └── home/
├── shared/         # Shared UI components, stores, utilities
│   ├── stores/     # Zustand stores
│   └── ui/         # AppShell, NavItems, Toaster, etc.
└── tests/          # Component and feature tests
```

## Environment

The API base URL is configured in `src/core/api/httpClient.ts`. For local development it points to `http://localhost:3000`. Update this for production deployments.
