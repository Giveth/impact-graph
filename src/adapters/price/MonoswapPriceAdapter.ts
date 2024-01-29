import {
  GetTokenPriceParams,
  PriceAdapterInterface,
} from './PriceAdapterInterface';
import { CHAIN_ID } from '@giveth/monoswap/dist/src/sdk/sdkFactory';
import { getMonoSwapTokenPrices } from '../../services/donationService';
import { logger } from '../../utils/logger';

export class MonoswapPriceAdapter implements PriceAdapterInterface {
  async getTokenPrice(params: GetTokenPriceParams): Promise<number> {
    try {
      let baseTokens: string[];
      switch (params.networkId) {
        case CHAIN_ID.XDAI:
          baseTokens = ['WXDAI', 'WETH'];
          break;
        case CHAIN_ID.POLYGON:
          baseTokens = ['USDC', 'MATIC'];
          break;
        case CHAIN_ID.CELO:
        case CHAIN_ID.ALFAJORES:
          baseTokens = ['cUSD', 'CELO'];
          break;
        default:
          baseTokens = ['USDT', 'ETH'];
          break;
      }
      const tokenPrices = await getMonoSwapTokenPrices(
        params.symbol,
        baseTokens,
        params.networkId,
      );
      return Number(tokenPrices[0]);
    } catch (e) {
      logger.error('Error in MonoswapPriceAdapter', e);
      throw e;
    }
  }
}
