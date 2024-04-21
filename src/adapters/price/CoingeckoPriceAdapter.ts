import axios from 'axios';
import {
  GetTokenPriceAtDateParams,
  GetTokenPriceParams,
  PriceAdapterInterface,
} from './PriceAdapterInterface';
import { getRedisObject, setObjectInRedis } from '../../redis';
import { logger } from '../../utils/logger';

const coingeckoCacheExpirationInSeconds =
  Number(process.env.COINGECKO_CACHE_EXPIRATION_IN_SECONDS) || 60 * 60 * 24; // 1 hour

export const COINGECKO_TOKEN_IDS = {
  SOLANA: 'solana',
  MSOL: 'msol',
  USDC: 'usd-coin',
  USDT: 'tether',
  RAY: 'raydium',
  BSOL: 'blazestake-staked-sol',
  AUDIO: 'audius-wormhole',
  MANGO: 'mango-markets',
  C98: 'coin98',
};

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

  async getTokenPriceAtDate(
    params: GetTokenPriceAtDateParams,
  ): Promise<number> {
    try {
      const result = await axios.get(
        // symbol in here means coingecko id for instance for ETC token the coingecko id is ethereum-classic
        `https://api.coingecko.com/api/v3/coins/${params.symbol}/history?date=${params.date}`,
      );

      const priceUsd = result?.data?.market_data?.current_price?.usd;
      if (!priceUsd) {
        throw new Error(
          `History Price not found for ${params.symbol} in coingecko`,
        );
      }
      return priceUsd;
    } catch (e) {
      logger.error('Error in CoingeckoHistoricPriceAdapter', e);
      throw e;
    }
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
