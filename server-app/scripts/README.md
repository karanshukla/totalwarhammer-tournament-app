# Seed scripts

`mongosh` scripts that fill a database with realistic showcase data: both game
systems, every tournament type, and every match state the UI can render
(pending, in_progress, completed, disputed, overridden).

They write raw documents shaped to match `src/domain/models/` and the bracket
output of `src/domain/services/tournament-service.js`. They are not part of the
app and are never imported by it.

## Running

```bash
mongosh "$MONGO_URI" --file scripts/seed-showcase.js
mongosh "$MONGO_URI" --file scripts/seed-owner.js     # optional, run second
```

Against a Railway MongoDB service:

```bash
base64 -w0 scripts/seed-showcase.js | railway ssh -s MongoDB bash -lc \
  'base64 -d > /tmp/seed.js && mongosh \
     -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" \
     --authenticationDatabase admin <db> --quiet --file /tmp/seed.js'
```

| Script             | What it adds                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `seed-showcase.js` | 40 users, 10 tournaments, 77 matches across WH3 and 40k                                           |
| `seed-owner.js`    | 3 tournaments owned and played by a real account, set via `OWNER_USERNAME` at the top of the file |

Both are idempotent: each clears its own previous run before inserting, so
re-running gives you the same data with fresh ids and codes.

## Safety

Seed users are identified solely by an `@seed.invalid` email and carry no
password, so none of them can log in. The scripts only ever delete users
matching that pattern and tournaments those users appear in. Seed usernames are
renamed with a numeric suffix if they collide with a real account.

Teardown is at the bottom of `seed-showcase.js`. It also removes tournaments
owned by a real account that contain a seed participant, which is how
`seed-owner.js` output gets cleaned up. The consequence is that a genuine
tournament with a seed user in its roster would be deleted too, so delete the
seed users first if you ever want to keep one.

Direct DB writes do not call `invalidateStatsCache()`, so the stats endpoint can
serve stale numbers for up to `CACHE_TTL` (5 minutes, see
`src/infrastructure/services/stats-service.js`).
