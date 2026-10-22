import { RedisOptions, Redis } from 'ioredis';
import { logger } from './utils/logger';

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

// --- Redis lease (best-effort, token-checked, bounded) ------------------------
//
// A short-lived mutual-exclusion lease on a single key: SET key token PX ttl NX
// to acquire, and a Lua get/compare/del to release, so a holder whose lease
// expired and was re-acquired by someone else can never delete the other
// holder's key.
//
// The lease is an efficiency guard, not a correctness guarantee: when Redis is
// unreachable the work runs unlocked (logged), and every Redis round trip is
// bounded by LEASE_REDIS_OP_TIMEOUT_MS so that an ioredis offline queue (which
// otherwise keeps a command pending across its reconnect attempts) cannot make
// a user-facing request hang. Callers that need a hard guarantee must have one
// at the data layer (advisory lock, unique index, guarded update).
const RELEASE_LEASE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
export const LEASE_REDIS_OP_TIMEOUT_MS = 2_000;

const withTimeout = <T>(promise: Promise<T>, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(`${label} timed out after ${LEASE_REDIS_OP_TIMEOUT_MS}ms`),
        ),
      LEASE_REDIS_OP_TIMEOUT_MS,
    );
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

export type RedisLeaseOutcome<T> =
  | { acquired: true; result: T }
  | { acquired: false; result?: undefined };

/**
 * Runs `fn` under a Redis lease on `key`.
 *
 * - `{ acquired: false }` when another holder owns the key: `fn` is NOT run.
 * - `{ acquired: true, result }` after `fn` ran. If Redis was unreachable or
 *   slow, `fn` still runs (unlocked) and the error is logged; the caller cannot
 *   tell the two apart on purpose, since both mean "the work was done".
 */
export const withRedisLease = async <T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<RedisLeaseOutcome<T>> => {
  const token = `${process.pid}:${Date.now()}:${Math.random()}`;
  let leaseHeld = false;
  try {
    if (redis.status !== 'ready') {
      // Do not queue behind a reconnect; treat it like any other Redis error.
      throw new Error(`redis status is ${redis.status}`);
    }
    const acquired = await withTimeout(
      redis.set(key, token, 'PX', ttlMs, 'NX'),
      `withRedisLease(${key}) acquire`,
    );
    if (acquired !== 'OK') {
      return { acquired: false };
    }
    leaseHeld = true;
  } catch (e) {
    logger.error(
      `withRedisLease(${key}) could not acquire the lease, running without it: ${e.message}`,
    );
  }
  try {
    return { acquired: true, result: await fn() };
  } finally {
    if (leaseHeld) {
      try {
        await withTimeout(
          redis.eval(RELEASE_LEASE_SCRIPT, 1, key, token),
          `withRedisLease(${key}) release`,
        );
      } catch (e) {
        // The key expires on its own after ttlMs.
        logger.error(
          `withRedisLease(${key}) could not release the lease: ${e.message}`,
        );
      }
    }
  }
};
