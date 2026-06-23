// Example cron script: expire stale pending matches older than 48 hours.
//
// Run via:
//   MONGO_URI=mongodb://... SCRIPT_PATH=scripts/example.js ./cron-runner
//
// mongosh executes this file against the database specified in MONGO_URI.

const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

const result = db.matches.updateMany(
  {
    status: "pending",
    createdAt: { $lt: cutoff },
  },
  {
    $set: { status: "expired", updatedAt: new Date() },
  }
);

print(`expired ${result.modifiedCount} stale pending matches`);
