// now is injectable for deterministic tests
export function createRateLimiter({ windowMs, max, now = () => Date.now() }) {
  const buckets = new Map();

  return function isAllowed(key) {
    const t = now();
    let bucket = buckets.get(key);

    if (!bucket || t >= bucket.resetAt) {
      bucket = { count: 0, resetAt: t + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    return bucket.count <= max;
  };
}
