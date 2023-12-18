import {
  GetTokenPriceParams,
  PriceAdapterInterface,
} from './PriceAdapterInterface';
import axios from 'axios';
import { getRedisObject, setObjectInRedis } from '../../redis';
import { logger } from '../../utils/logger';

const coingeckoCacheExpirationInSeconds =
  Number(process.env.COINGECKO_CACHE_EXPIRATION_IN_SECONDS) || 60 * 60 * 24; // 1 hour

export class CoingeckoPriceAdapter implements PriceAdapterInterface {
  redisCachePrefix = 'cache-price-cryptocompare-';

  async cachePrice(symbol: string, priceUsd: number): Promise<void> {
    // I want to set in redis with expiration
    await setObjectInRedis({
      key: `${this.redisCachePrefix}${symbol}`,
      value: { priceUsd },
      expirationInSeconds: coingeckoCacheExpirationInSeconds,
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
        // symbol in here means coingecko id for instance for ETC token the coingecko id is ethereum-classic
        `https://api.coingecko.com/api/v3/simple/price?ids=${params.symbol}&vs_currencies=usd`,
      );
      const priceUsd = result?.data[params.symbol]?.usd;
      if (!priceUsd) {
        throw new Error(`Price not found for ${params.symbol} in coingecko`);
      }
      await this.cachePrice(params.symbol, priceUsd);
      return priceUsd;
    } catch (e) {
      logger.error('Error in CoingeckoPriceAdapter', e);
      throw e;
    }
  }
}
