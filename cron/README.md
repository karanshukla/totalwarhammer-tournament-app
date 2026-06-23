# Cron Runner

A lightweight Go service for running scheduled maintenance scripts against MongoDB. Designed to be deployed as a [Railway Cron service](https://docs.railway.com/reference/cron-jobs).

## How it works

The Go binary reads two environment variables, connects to MongoDB via `mongosh`, and executes the specified script. The container exits with code `0` on success or non-zero on failure — Railway uses this to determine whether the cron job succeeded.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string, including the database name (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/twt-app`) |
| `SCRIPT_PATH` | Yes | Path to the `.js` script to run, relative to `/app` inside the container (e.g. `scripts/example.js`) |

## Adding a new script

1. Create a `.js` file in `cron/scripts/`. Scripts run in a `mongosh` context — `db` is already connected and points to the database in your `MONGO_URI`, so no connection boilerplate is needed.

```js
// cron/scripts/my-task.js
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const result = db.someCollection.deleteMany({ createdAt: { $lt: cutoff } });

print(`deleted ${result.deletedCount} records`);
```

2. Deploy a new Railway Cron service (or update an existing one) and set `SCRIPT_PATH=scripts/my-task.js`.

## Available scripts

| Script | Description |
|---|---|
| `scripts/example.js` | Expires pending matches older than 48 hours |
| `scripts/delete-guest-accounts.js` | Deletes guest accounts (no password) older than 48 hours |

## Deploying on Railway

1. Create a new service in your Railway project
2. Connect it to this repository and set the **Root Directory** to `cron/`
3. Set the service type to **Cron** and configure your schedule (e.g. `0 3 * * *` for 3 AM daily)
4. Add the required environment variables (`MONGO_URI`, `SCRIPT_PATH`)
5. Deploy — Railway will build the Docker image and run it on schedule

To run multiple cron jobs, create one Railway Cron service per script, each with its own schedule and `SCRIPT_PATH`.

## Running locally

```bash
# Build the image
docker build -t cron-runner ./cron

# Run a script
docker run --rm \
  -e MONGO_URI="mongodb://localhost:27017/twt-app" \
  -e SCRIPT_PATH="scripts/example.js" \
  cron-runner
```
