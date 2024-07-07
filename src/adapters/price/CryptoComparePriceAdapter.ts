import axios from 'axios';
import {
  GetTokenPriceParams,
  PriceAdapterInterface,
} from './PriceAdapterInterface';
import { getRedisObject, setObjectInRedis } from '../../redis';
import { logger } from '../../utils/logger';

const cryptoCompareCacheExpirationInSeconds =
  Number(process.env.COINGECKO_CACHE_EXPIRATION_IN_SECONDS) || 60 * 60 * 24 * 7; // 1 hour

export class CryptoComparePriceAdapter implements PriceAdapterInterface {
  redisCachePrefix = 'cache-price-coingecko-';

  async cachePrice(symbol: string, priceUsd: number): Promise<void> {
    // I want to set in redis with expiration
    await setObjectInRedis({
      key: `${this.redisCachePrefix}${symbol}`,
      value: { priceUsd },
      expirationInSeconds: cryptoCompareCacheExpirationInSeconds,
    });
  }

  async readTokenFromCache(symbol: string): Promise<number | null> {
    const result = await getRedisObject(`${this.redisCachePrefix}${symbol}`);
    if (!result) {
      return null;
    }
    return result.priceUsd;
  }

  async getTokenPrice(params: GetTokenPriceParams): Promise<number> {
    try {
      const cachedPrice = await this.readTokenFromCache(params.symbol);
      if (cachedPrice) {
        return cachedPrice;
      }
      const result = await axios.get(
        `https://min-api.cryptocompare.com/data/price?fsym=${params.symbol}&tsyms=USD`,
      );
      const priceUsd = result?.data?.USD;
      if (!priceUsd) {
        throw new Error(
          `Price not found for ${params.symbol} in cryptocompare`,
        );
      }
      await this.cachePrice(params.symbol, priceUsd);
      return priceUsd;
    } catch (e) {
      logger.error('Error in CryptoComparePriceAdapter', e);
      throw e;
    }
  }
}
