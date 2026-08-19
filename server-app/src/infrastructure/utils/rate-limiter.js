// now is injectable for deterministic tests
export function createRateLimiter({ windowMs, max, now = () => Date.now() }) {
  const buckets = new Map();

  function isAllowed(key) {
    const t = now();
    let bucket = buckets.get(key);

    if (!bucket || t >= bucket.resetAt) {
      bucket = { count: 0, resetAt: t + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    return bucket.count <= max;
  }

  // Callers that key on a short-lived identity (a socket id, say) must be able
  // to reclaim the bucket, otherwise the Map grows without bound.
  isAllowed.forget = (key) => buckets.delete(key);

  isAllowed.pruneExpired = () => {
    const t = now();
    for (const [key, bucket] of buckets) {
      if (t >= bucket.resetAt) buckets.delete(key);
    }
  };

  isAllowed.size = () => buckets.size;

  return isAllowed;
}
