"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCachePattern = exports.deleteCache = exports.setCache = exports.getCache = exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
exports.redisClient = (0, redis_1.createClient)({
    url: redisUrl
});
let isRedisConnected = false;
let hasLoggedError = false;
exports.redisClient.on('error', (err) => {
    if (!hasLoggedError) {
        console.warn('[REDIS] Could not reach Redis server. Caching disabled. Error:', err.message);
        hasLoggedError = true;
    }
    isRedisConnected = false;
});
exports.redisClient.on('connect', () => {
    console.log('[REDIS] Connecting to Redis...');
});
exports.redisClient.on('ready', () => {
    console.log('[REDIS] Redis client connected and ready.');
    isRedisConnected = true;
    hasLoggedError = false; // Reset so errors show again if connection drops
});
exports.redisClient.on('end', () => {
    console.log('[REDIS] Redis connection closed.');
    isRedisConnected = false;
});
const connectRedis = async () => {
    try {
        await exports.redisClient.connect();
    }
    catch (err) {
        console.warn('[REDIS] Could not connect to Redis server. Caching will be disabled. Error:', err);
        isRedisConnected = false;
    }
};
exports.connectRedis = connectRedis;
const getCache = async (key) => {
    if (!isRedisConnected)
        return null;
    try {
        const value = await exports.redisClient.get(key);
        return value ? JSON.parse(value) : null;
    }
    catch (err) {
        console.warn(`[REDIS] Error getting cache for key ${key}:`, err);
        return null;
    }
};
exports.getCache = getCache;
const setCache = async (key, value, ttlSeconds = 300) => {
    if (!isRedisConnected)
        return;
    try {
        await exports.redisClient.set(key, JSON.stringify(value), {
            EX: ttlSeconds
        });
    }
    catch (err) {
        console.warn(`[REDIS] Error setting cache for key ${key}:`, err);
    }
};
exports.setCache = setCache;
const deleteCache = async (key) => {
    if (!isRedisConnected)
        return;
    try {
        await exports.redisClient.del(key);
    }
    catch (err) {
        console.warn(`[REDIS] Error deleting cache for key ${key}:`, err);
    }
};
exports.deleteCache = deleteCache;
const clearCachePattern = async (pattern) => {
    if (!isRedisConnected)
        return;
    try {
        const keys = await exports.redisClient.keys(pattern);
        if (keys && keys.length > 0) {
            await exports.redisClient.del(keys);
            console.log(`[REDIS] Cleared cache keys matching pattern ${pattern}:`, keys);
        }
    }
    catch (err) {
        console.warn(`[REDIS] Error clearing cache pattern ${pattern}:`, err);
    }
};
exports.clearCachePattern = clearCachePattern;
//# sourceMappingURL=redis.js.map