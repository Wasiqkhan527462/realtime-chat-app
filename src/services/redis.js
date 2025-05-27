const { createClient } = require('redis');

const redisClient = createClient({ url: process.env.REDIS_URL })
  .on('error', err => console.error('❌ Redis Client Error:', err));

const connectRedis = async () => {
  await redisClient.connect();
  console.log('✅ Connected to Redis Cloud');
};

const cacheMessages = (roomId, messages) => 
  redisClient.set(`room:${roomId}:messages`, JSON.stringify(messages), { EX: 60 });

const getCachedMessages = async (roomId) => {
  const data = await redisClient.get(`room:${roomId}:messages`);
  return data && JSON.parse(data);
};

const invalidateRoomCache = (roomId) => redisClient.del(`room:${roomId}:messages`);

module.exports = { connectRedis, cacheMessages, getCachedMessages, invalidateRoomCache };
