import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 0,   // fail fast — no retries
    commandTimeout: 500,       // abort individual commands after 500 ms
    connectTimeout: 500,
    enableReadyCheck: false,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

redis.on("error", () => {
  // API handlers surface Redis failures through their responses; avoid build-time noise.
});

export async function acquireLock(
  key: string,
  ttlMs: number,
): Promise<string | null> {
  const lockKey = `lock:${key}`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await redis.set(lockKey, token, "PX", ttlMs, "NX");
  return result === "OK" ? token : null;
}

export async function releaseLock(key: string, token: string): Promise<void> {
  const lockKey = `lock:${key}`;
  await redis.eval(
    `if redis.call("get", KEYS[1]) == ARGV[1] then
       return redis.call("del", KEYS[1])
     else
       return 0
     end`,
    1,
    lockKey,
    token,
  );
}
