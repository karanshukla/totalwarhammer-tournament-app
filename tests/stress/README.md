# Stress test

`stress-test.mjs` drives many tournaments through their full lifecycle
(register/login → create → guests join → start → report every match →
advance every round → complete) concurrently against a running instance of
the app, entirely over the real HTTP API — nothing writes to Mongo directly.
It answers: how does one Mongo + one Redis + one server instance behave with
several tournaments active at once?

Tournament types cycle through all four (Single/Double Elimination, Round
Robin, Swiss System) so bracket-generation and advance-round logic for each
gets exercised under concurrent load, not just one path.

## Running

The app's two HTTP rate limiters (300 req/15min global, 20 req/15min on
login/register) are sized for real traffic, not a load generator running from
one machine/IP — a moderate run trips them in seconds otherwise. Start the
stack with the stress overlay, which only raises those limits and points at a
separate `twt-stress-test` database so no real data is touched:

```bash
docker compose -f docker-compose.yml -f docker-compose.stress.yml up -d --build
node tests/stress/stress-test.mjs
```

Tear down afterward:

```bash
docker compose exec mongo mongosh twt-stress-test --eval "db.dropDatabase()"
docker compose -f docker-compose.yml -f docker-compose.stress.yml down
```

## Configuration

Environment variables (all optional):

| Var | Default | Meaning |
| --- | --- | --- |
| `STRESS_BASE_URL` | `http://localhost:8080` | Target — defaults to the Caddy-fronted stack |
| `STRESS_TOURNAMENTS` | `20` | Concurrent tournaments |
| `STRESS_PARTICIPANTS` | `8` | Participants per tournament (creator + guests). Keep this a power of two so brackets have no byes |
| `STRESS_RUN_TAG` | current timestamp | Suffix for generated usernames/emails, so re-runs don't collide |

## What it does per tournament

1. Registers + logs in a real account as the creator (guests can't create tournaments).
2. Creates the tournament.
3. Spins up `STRESS_PARTICIPANTS - 1` guest sessions and joins them **concurrently** — this is the write-concurrency path (many participants racing to join the same tournament document).
4. Starts the tournament, builds the participant→session map from the joined roster.
5. Loops: fetch current matches, report every open match from both participants' own sessions (real two-sided consensus, not a creator override), call `advance`, repeat until the tournament reports `completed`.

## Output

Prints per-action request counts, error counts, and p50/p95/p99 latency, plus
which tournaments (if any) didn't reach `completed`. It does not collect
container resource metrics — pair it with `docker stats` in another terminal
if you want CPU/memory alongside the latency numbers.
