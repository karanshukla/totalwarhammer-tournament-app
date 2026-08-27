# Playwright E2E tests

Browser-level tests that drive the real stack: the built client behind Caddy,
the Express server, MongoDB and Redis. They cover what the unit suites cannot —
CSRF negotiation, session cookies, and the single-origin routing that puts the
client and the API on the same host.

The Hurl suite in `tests/hurl/` covers the API's auth boundaries directly.
These specs are the layer above it: what a person can actually do in a browser.

## Running locally

Docker is required — the specs run against the compose stack, not a Vite dev
server.

```bash
npm run e2e:up          # build and start the stack on http://localhost:8080
npm run test:e2e        # run the suite
npm run e2e:down        # stop and drop the volumes
```

While iterating:

```bash
npm run test:e2e:ui                       # Playwright's watch UI
npx playwright test specs/smoke.spec.ts   # a single file
npx playwright test --headed --debug      # step through in a real browser
npm run test:e2e:report                   # open the last HTML report
```

Point the suite at a stack on another host with `E2E_BASE_URL`.

## Layout

| Path | Contents |
|------|----------|
| `fixtures.ts` | The `test` object every spec imports; blocks third-party fonts |
| `helpers/identity.ts` | Unique per-run usernames, emails and tournament names |
| `helpers/auth.ts` | The auth drawer: register, log in, log out, continue as guest |
| `helpers/tournaments.ts` | Create a tournament, look one up by code |
| `specs/` | The specs themselves |

## Conventions

- **Import `test` from `../fixtures`, not from `@playwright/test`.** The
  fixture aborts requests to Google Fonts, whose render-blocking `<link>` in
  `index.html` otherwise puts a third-party CDN in front of every navigation —
  roughly 10× slower per test, and a hang when it is unreachable.
- **Never hard-code a username, email or tournament name.** The stack keeps its
  data between runs, and specs run in parallel; `helpers/identity.ts` builds
  unique ones.
- **Prefer role and label queries** over CSS selectors, so a spec fails when the
  UI stops being reachable rather than when a class name changes.
- **A spec sets up its own state.** There is no seeded fixture data and no
  ordering between specs.

## The stack the specs run against

`docker-compose.e2e.yml` overlays two changes onto the normal stack:

- `NODE_ENV=development`, so session and CSRF cookies are not marked `Secure`
  and survive plain HTTP on `localhost:8080`.
- Raised rate limits, because a browser spends far more requests per scenario
  than a bare API call does.

It also points the server at its own `twt-e2e-test` database. That database is
never reset between runs — `npm run e2e:down` drops the volumes when you want a
clean slate.
