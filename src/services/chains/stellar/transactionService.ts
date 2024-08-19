import {
  NetworkTransactionInfo,
  TransactionDetailInput,
  validateTransactionWithInputData,
} from '../index';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages';
import axios from 'axios';

const STELLAR_HORIZON_API_URL =
  process.env.STELLAR_HORIZON_API_URL || 'https://horizon.stellar.org';

const getStellarTransactionInfo = async (
  txHash: string,
): Promise<NetworkTransactionInfo | null> => {
  const NATIVE_STELLAR_ASSET_CODE = 'XLM';
  // Fetch transaction info from stellar network

  const response = await axios.get(
    `${STELLAR_HORIZON_API_URL}/transactions/${txHash}/payments`,
  );

  const transaction = response.data._embedded.records[0];

  if (!transaction) return null;

  // when a transaction is made to a newly created account, Stellar mark it as type 'create_account'
  if (transaction.type === 'create_account') {
    return {
      hash: transaction.transaction_hash,
      amount: Number(transaction.starting_balance),
      from: transaction.source_account,
      to: transaction.account,
      currency: NATIVE_STELLAR_ASSET_CODE,
      timestamp: transaction.created_at,
    };
  } else if (transaction.type === 'payment') {
    if (transaction.asset_type !== 'native') return null;
    return {
      hash: transaction.transaction_hash,
      amount: Number(transaction.amount),
      from: transaction.from,
      to: transaction.to,
      currency: NATIVE_STELLAR_ASSET_CODE,
      timestamp: transaction.created_at,
    };
  } else return null;
};

export async function getStellarTransactionInfoFromNetwork(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo> {
  let txData;
  txData = await getStellarTransactionInfo(input.txHash);
  if (!txData) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.TRANSACTION_NOT_FOUND),
    );
  }
  validateTransactionWithInputData(txData, input);
  return txData;
}
