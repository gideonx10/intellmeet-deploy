import redisClient from '../config/redis.js';

export const getCache = async (key) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const setCache = async (key, value, ttlSeconds = 300) => {
  await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
};

export const deleteCache = async (key) => {
  await redisClient.del(key);
};