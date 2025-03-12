import axios from 'axios';
import config from '../config';
import { logger } from '../utils/logger';
const integratorId: string = config.get('SQUID_INTEGRATOR_ID') as string;

interface ChainData {
  id: string;
  chainId: string;
  networkIdentifier: string;
  chainName: string;
  axelarChainName: string;
  type: string;
  networkName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
    icon: string;
  };
  chainIconURI: string;
  blockExplorerUrls: string[];
  swapAmountForGas: string;
  sameChainSwapsSupported: boolean;
  compliance: {
    trmIdentifier: string;
  };
  boostSupported: boolean;
  enableBoostByDefault: boolean;
  rpcList: string[];
  chainNativeContracts: {
    wrappedNativeToken: string;
    ensRegistry: string;
    multicall: string;
    usdcToken: string;
  };
}

interface ChainInfo {
  transactionId: string;
  blockNumber: number;
  callEventStatus: string;
  callEventLog: Array<{
    contractAddress: string;
    args: {
      eventFragment: {
        name: string;
        anonymous: boolean;
        inputs: Array<{
          name: string;
          type: string;
          indexed: boolean;
        }>;
      };
      name: string;
      signature: string;
      topic: string;
      args: string[];
    };
  }>;
  chainData: ChainData;
  transactionUrl: string;
}

interface TimeSpent {
  call_express_executed: number;
  express_executed_confirm: number;
  call_confirm: number;
  call_approved: number;
  express_executed_approved: number;
  total: number;
  approved_executed: number;
}

interface SquidStatusResponse {
  id: string;
  status: string;
  gasStatus: string;
  isGMPTransaction: boolean;
  axelarTransactionUrl: string;
  squidTransactionStatus: string;
  fromChain: ChainInfo;
  toChain: ChainInfo;
  timeSpent: TimeSpent;
  routeStatus: Array<{
    chainId: string;
    txHash: string;
    status: string;
    action: string;
  }>;
  error: Record<string, any>;
}

export const getStatus = async (params: {
  transactionId: string;
  requestId: string;
  fromChainId: string;
  toChainId: string;
}): Promise<SquidStatusResponse> => {
  try {
    const result = await axios.get<SquidStatusResponse>(
      'https://apiplus.squidrouter.com/v2/status',
      {
        params,
        headers: {
          'x-integrator-id': integratorId,
        },
      },
    );
    return result.data;
  } catch (error: any) {
    if (error.response) {
      logger.error('API error:', error.response.data);
    }
    logger.error('Error with parameters:', params);
    throw error;
  }
};
