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
