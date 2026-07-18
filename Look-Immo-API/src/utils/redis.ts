import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl
});

let isRedisConnected = false;
let hasLoggedError = false;

redisClient.on('error', (err) => {
  if (!hasLoggedError) {
    console.warn('[REDIS] Could not reach Redis server. Caching disabled. Error:', err.message);
    hasLoggedError = true;
  }
  isRedisConnected = false;
});

redisClient.on('connect', () => {
  console.log('[REDIS] Connecting to Redis...');
});

redisClient.on('ready', () => {
  console.log('[REDIS] Redis client connected and ready.');
  isRedisConnected = true;
  hasLoggedError = false; // Reset so errors show again if connection drops
});

redisClient.on('end', () => {
  console.log('[REDIS] Redis connection closed.');
  isRedisConnected = false;
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn('[REDIS] Could not connect to Redis server. Caching will be disabled. Error:', err);
    isRedisConnected = false;
  }
};

export const getCache = async (key: string): Promise<any | null> => {
  if (!isRedisConnected) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.warn(`[REDIS] Error getting cache for key ${key}:`, err);
    return null;
  }
};

export const setCache = async (key: string, value: any, ttlSeconds: number = 300): Promise<void> => {
  if (!isRedisConnected) return;
  try {
    await redisClient.set(key, JSON.stringify(value), {
      EX: ttlSeconds
    });
  } catch (err) {
    console.warn(`[REDIS] Error setting cache for key ${key}:`, err);
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!isRedisConnected) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.warn(`[REDIS] Error deleting cache for key ${key}:`, err);
  }
};

export const clearCachePattern = async (pattern: string): Promise<void> => {
  if (!isRedisConnected) return;
  try {
    const keys: string[] = [];
    for await (const key of redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 100
    })) {
      keys.push(String(key));
    }

    if (keys.length > 0) {
      await Promise.all(keys.map(key => redisClient.del(key)));
      console.log(`[REDIS] Cleared cache keys matching pattern ${pattern}:`, keys);
    }
  } catch (err) {
    console.warn(`[REDIS] Error clearing cache pattern ${pattern}:`, err);
  }
};
