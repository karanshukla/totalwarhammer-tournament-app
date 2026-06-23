// Delete guest accounts (no password field) older than 48 hours.
//
// "Guest" in this app means a session-only user created without a password.
// These accounts accumulate over time and are safe to purge once stale.
//
// mongosh connects using MONGO_URI (set in Railway env), so `db` already
// points to the database named in the URI (e.g. twt-app).

const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

const result = db.users.deleteMany({
  password: { $exists: false },
  createdAt: { $lt: cutoff },
});

print(`deleted ${result.deletedCount} guest accounts older than 48 hours`);
