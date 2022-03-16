import { v4 } from 'uuid';
import { redis } from '../redis';
import { confirmUserPrefix } from '../constants/redisPrefixes';
import config from '../config';

export const createConfirmationUrl = async (userId: number) => {
  const token = v4();
  await redis.set(confirmUserPrefix + token, userId, 'ex', 60 * 60 * 24); // 1 day expiration

  return `http://${config.get('WEBSITE_URL')}/user/confirm/${token}`;
};
