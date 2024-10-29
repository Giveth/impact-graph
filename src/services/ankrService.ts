import {
  AnkrProvider,
  Blockchain,
  TokenTransfer,
  Transaction,
} from '@ankr.com/ankr.js';
import { QACC_DONATION_TOKEN_ADDRESS } from '../constants/qacc';
import { logger } from '../utils/logger';
import {
  getAnkrState,
  setAnkrTimestamp,
} from '../repositories/ankrStateRepository';
import { ANKR_FETCH_START_TIMESTAMP, ANKR_RPC_URL } from '../constants/ankr';

function getNetworkIdString(rpcUrl: string): Blockchain {
  const [, , , networkIdString] = rpcUrl.split('/');
  return networkIdString as Blockchain;
}
function getAdvancedApiEndpoint(rpcUrl) {
  const dissembled = rpcUrl.split('/');
  dissembled[3] = 'multichain';
  const reassembled = dissembled.join('/');
  return reassembled;
}
const pageSize = 10000;

const getAnkrProviderAndNetworkId = ():
  | {
      provider: AnkrProvider;
      networkIdString: Blockchain;
    }
  | undefined => {
  if (!ANKR_RPC_URL) {
    return undefined;
  }

  const networkIdString = getNetworkIdString(ANKR_RPC_URL);
  const provider = new AnkrProvider(getAdvancedApiEndpoint(ANKR_RPC_URL));

  return {
    provider,
    networkIdString,
  };
};

export const fetchAnkrTransfers = async ({
  addresses,
  fromTimestamp,
  transferHandler,
}: {
  addresses: string[];
  fromTimestamp: number;
  transferHandler: (transfer: TokenTransfer) => void;
}): Promise<{ lastTimeStamp: number | undefined }> => {
  const ankrConfig = getAnkrProviderAndNetworkId();
  if (!ankrConfig) {
    logger.error('Ankr provider not configured');
    return { lastTimeStamp: undefined };
  }
  const { provider, networkIdString } = ankrConfig;

  let pageToken: string | undefined = undefined;
  let lastTimeStamp: number | undefined = undefined;
  let retries = 0;
  do {
    try {
      const result = await provider.getTokenTransfers({
        address: addresses,
        blockchain: networkIdString,
        fromTimestamp,
        pageSize,
        pageToken,
      });

      retries = 0;

      for (const transfer of result.transfers) {
        if (
          transfer.contractAddress?.toLowerCase() ===
          QACC_DONATION_TOKEN_ADDRESS
        ) {
          try {
            await transferHandler(transfer);
          } catch (e) {
            logger.error('Error processing transfer', e);

            // If we fail to process a transfer, we should not update the timestamp
            return { lastTimeStamp: undefined };
          }
        }
        lastTimeStamp = transfer.timestamp;
      }

      pageToken = result.nextPageToken;
    } catch (e) {
      logger.info('Error fetching transfers', e);
      if (retries < 10) {
        retries++;
        logger.debug('Retrying');
        continue;
      } else {
        throw e;
      }
    }
  } while (pageToken);

  return { lastTimeStamp };
};

export const processAnkrTransfers = async ({
  addresses,
  transferHandler,
}: {
  addresses: string[];
  transferHandler: (transfer: TokenTransfer) => void;
}): Promise<void> => {
  const ankrState = await getAnkrState();

  const fromTimestamp = ankrState?.timestamp || ANKR_FETCH_START_TIMESTAMP;

  const { lastTimeStamp } = await fetchAnkrTransfers({
    addresses,
    fromTimestamp,
    transferHandler,
  });

  if (lastTimeStamp) {
    await setAnkrTimestamp(lastTimeStamp);
  }
};

export const getTransactionByHash = async (
  hash: string,
): Promise<Transaction | undefined> => {
  const ankrConfig = getAnkrProviderAndNetworkId();
  if (!ankrConfig) {
    logger.error('Ankr provider not configured');
    return;
  }
  const { provider, networkIdString } = ankrConfig!;

  const response = await provider.getTransactionsByHash({
    transactionHash: hash,
    blockchain: networkIdString,
  });

  return response?.transactions[0];
};
