import { RedisOptions } from 'ioredis';
// tslint:disable-next-line:no-var-requires
const Redis = require('ioredis');
export const redisConfig: RedisOptions = {
  port: Number(process.env.REDIS_PORT) || 6379,
  host: process.env.REDIS_HOST || 'localhost',
};
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}
export const redis = new Redis(redisConfig);

export const setObjectInRedis = async (params: {
  key: string;
  value: any;
  expirationInSeconds: number;
}): Promise<void> => {
  const { key, value, expirationInSeconds } = params;
  await redis.setex(key, expirationInSeconds, JSON.stringify(value, null, 4));
};
export const getRedisObject = async (key: string): Promise<any> => {
  const result = await redis.get(key);
  if (!result) {
    return null;
  }
  try {
    return JSON.parse(result);
  } catch (e) {
    return result;
  }
};
