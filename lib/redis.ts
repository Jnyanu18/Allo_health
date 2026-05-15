import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.error("Redis client error:", err);
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Distributed lock helpers
export async function acquireLock(
  key: string,
  ttlMs: number = 5000,
): Promise<string | null> {
  const lockKey = `lock:${key}`;
  const lockValue = `${Date.now()}-${Math.random()}`;
  // SET NX EX (set if not exists with TTL)
  const result = await redis.set(lockKey, lockValue, "PX", ttlMs, "NX");
  return result === "OK" ? lockValue : null;
}

export async function releaseLock(
  key: string,
  lockValue: string,
): Promise<void> {
  const lockKey = `lock:${key}`;
  // Lua script to ensure we only delete our own lock
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, 1, lockKey, lockValue);
}
