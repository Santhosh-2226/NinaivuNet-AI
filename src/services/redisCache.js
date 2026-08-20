const Redis = require("ioredis");
const logger = require("../utils/logger");
const config = require("../config/config");

let redisClient = null;
const memoryCache = new Map();
let redisUnavailable = false;

try {
  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 0,
    connectTimeout: 2000,
    lazyConnect: true,
    retryStrategy: () => null,       // never retry
    enableOfflineQueue: false,
    reconnectOnError: () => false,
  });

  client.on("error", (err) => {
    if (!redisUnavailable) {
      logger.warn(`Redis unavailable, using in-memory cache: ${err.message}`);
      redisUnavailable = true;
    }
    client.disconnect();
    redisClient = null;
  });

  client.on("connect", () => {
    redisUnavailable = false;
    redisClient = client;
    logger.info("Connected to Redis server successfully");
  });

  // Attempt a single connection
  client.connect().catch(() => {});
} catch (e) {
  logger.warn(`Failed to initialize Redis, using in-memory cache backup: ${e.message}`);
}

const get = async (key) => {
  if (redisClient) {
    try {
      return await redisClient.get(key);
    } catch (err) {
      logger.warn(`Redis get failed, reading from memory cache fallback: ${err.message}`);
    }
  }
  return memoryCache.get(key) || null;
};

const set = async (key, value, ttlSeconds = 3600) => {
  if (redisClient) {
    try {
      await redisClient.set(key, value, "EX", ttlSeconds);
      return;
    } catch (err) {
      logger.warn(`Redis set failed, writing to memory cache fallback: ${err.message}`);
    }
  }
  memoryCache.set(key, value);
  // Simple memory cache expiration
  setTimeout(() => {
    if (memoryCache.get(key) === value) {
      memoryCache.delete(key);
    }
  }, ttlSeconds * 1000);
};

const del = async (key) => {
  if (redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      logger.warn(`Redis delete failed: ${err.message}`);
    }
  }
  memoryCache.delete(key);
};

module.exports = {
  get,
  set,
  del
};
