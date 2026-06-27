export declare const redisClient: import("redis").RedisClientType<{}, {}, {}, 3, {}>;
export declare const connectRedis: () => Promise<void>;
export declare const getCache: (key: string) => Promise<any | null>;
export declare const setCache: (key: string, value: any, ttlSeconds?: number) => Promise<void>;
export declare const deleteCache: (key: string) => Promise<void>;
export declare const clearCachePattern: (pattern: string) => Promise<void>;
//# sourceMappingURL=redis.d.ts.map