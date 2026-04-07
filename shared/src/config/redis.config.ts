export const getRedisConfig = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || 'tellerpass',
  maxRetriesPerRequest: null, // Required by BullMQ
});

export const getBullMQConnection = () => ({
  connection: getRedisConfig(),
});
