import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { TransactionDetailInput, NetworkTransactionInfo } from '..';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages';
import { logger } from '../../../utils/logger';

function getBlockfrost(projectId?: string) {
  const apiKey = projectId || process.env.BLOCKFROST_PROJECT_ID;
  if (!apiKey) {
    throw new Error('BLOCKFROST_PROJECT_ID is not set');
  }
  return new BlockFrostAPI({ projectId: apiKey });
}

export async function getCardanoTransactionInfoFromNetwork(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo> {
  try {
    const blockfrost = getBlockfrost();
    const tx = await blockfrost.txs(input.txHash);

    // Get UTXOs to derive from/to and amount
    const utxos = await blockfrost.txsUtxos(input.txHash);

    // Sum ADA sent to target address (lovelace -> ADA)
    const toOutputs = utxos.outputs.filter(o => o.address === input.toAddress);
    let amountLovelace = BigInt(0);
    let currency = 'ADA';
    if (input.symbol && input.symbol !== 'ADA') {
      // Token transfer: search assets with matching policy+asset? Here we only support ADA as native
      currency = input.symbol;
    }
    for (const out of toOutputs) {
      for (const amt of out.amount) {
        if (amt.unit === 'lovelace') {
          amountLovelace += BigInt(amt.quantity);
        }
      }
    }
    const amountAda = Number(amountLovelace) / 1_000_000;

    // Derive from address: first input address
    const fromAddress = utxos.inputs[0]?.address || '';

    const info: NetworkTransactionInfo = {
      hash: tx.hash,
      amount: amountAda,
      from: fromAddress,
      to: input.toAddress,
      currency,
      timestamp: tx.block_time ? Number(tx.block_time) : input.timestamp,
    };

    return info;
  } catch (error) {
    logger.error('getCardanoTransactionInfoFromNetwork() error', { error });
    throw new Error(i18n.__(translationErrorMessagesKeys.TX_NOT_FOUND));
  }
}
