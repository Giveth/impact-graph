import { logger } from '../utils/logger';
import { CryptoComparePriceAdapter } from '../adapters/price/CryptoComparePriceAdapter';
import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';
import { MonoswapPriceAdapter } from '../adapters/price/MonoswapPriceAdapter';

export interface CustomToken {
  symbol: string;
  cryptoCompareId?: string;
  coingeckoId?: string;
  isStableCoin?: boolean;
}

export const getTokenPrice = async (
  chainId: number,
  token: CustomToken,
): Promise<number> => {
  if (!token) {
    return 0;
  }
  try {
    const { symbol, cryptoCompareId, isStableCoin, coingeckoId } = token;
    logger.debug('getTokenPrice token', token);
    let priceUsd: number;
    if (isStableCoin) {
      priceUsd = 1;
      // } else if (currency === 'mpETH') {
      //   const mpEthPriceInUsd = await fetchMpEthPrice();
      //   donation.priceUsd = toFixNumber(mpEthPriceInUsd, 4);
      //   donation.valueUsd = toFixNumber(donation.amount * mpEthPriceInUsd, 4);
    } else if (cryptoCompareId) {
      priceUsd = await new CryptoComparePriceAdapter().getTokenPrice({
        symbol: cryptoCompareId,
        networkId: chainId,
      });
    } else if (coingeckoId) {
      priceUsd = await new CoingeckoPriceAdapter().getTokenPrice({
        symbol: coingeckoId,
        networkId: chainId,
      });
    } else {
      priceUsd = await new MonoswapPriceAdapter().getTokenPrice({
        symbol,
        networkId: chainId,
      });
    }
    return Number(priceUsd || 0);
  } catch (error) {
    logger.debug('getTokenPrice() error', {
      token,
      chainId,
      error,
    });
    throw new Error(error);
  }
};
