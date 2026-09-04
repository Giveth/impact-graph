import axios from 'axios';
import {
  NetworkTransactionInfo,
  TransactionDetailInput,
  validateTransactionWithInputData,
} from '../index';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages';
import {
  byLargestStellarOperation,
  isNativeStellarDeposit,
  stellarOperationAmount,
} from './stellarOperations';

const STELLAR_HORIZON_API_URL =
  process.env.STELLAR_HORIZON_API_URL || 'https://horizon.stellar.org';

const getStellarTransactionInfo = async (
  txHash: string,
  toAddress: string,
  expectedAmount: number,
  expectedFromAddress: string,
): Promise<NetworkTransactionInfo | null> => {
  const NATIVE_STELLAR_ASSET_CODE = 'XLM';
  // Fetch transaction info from stellar network

  const response = await axios.get(
    `${STELLAR_HORIZON_API_URL}/transactions/${txHash}/payments`,
  );

  const records = response.data._embedded.records || [];

  // A Stellar transaction can carry multiple payment operations (exchanges
  // batch several withdrawals into one transaction, and one batch can even
  // pay the same address for two different donations), so pick the operation
  // this donation refers to rather than blindly taking the first record:
  // closest to the donation's amount, then the donation's own sender, then
  // the largest (the QR matcher's rule for which operation a donation
  // records). When none pays the recipient, fall back to the first record so
  // the validation below still reports the same to-address mismatch as
  // before for transactions that don't pay this address at all.
  const expectedFrom = expectedFromAddress?.toLowerCase();
  const operationSender = (record: any): string | undefined =>
    (record.from ?? record.source_account)?.toLowerCase();
  const payingOps: any[] = records.filter((record: any) =>
    isNativeStellarDeposit(record, toAddress),
  );
  const transaction =
    payingOps.sort(
      (a: any, b: any) =>
        Math.abs(stellarOperationAmount(a) - expectedAmount) -
          Math.abs(stellarOperationAmount(b) - expectedAmount) ||
        Number(operationSender(b) === expectedFrom) -
          Number(operationSender(a) === expectedFrom) ||
        byLargestStellarOperation(a, b),
    )[0] ?? records[0];

  if (!transaction) return null;

  // Horizon's created_at is an ISO string; NetworkTransactionInfo carries
  // epoch seconds (the staleness validation subtracts timestamps).
  const timestampSecs = new Date(transaction.created_at).getTime() / 1000;

  // when a transaction is made to a newly created account, Stellar mark it as type 'create_account'
  if (transaction.type === 'create_account') {
    return {
      hash: transaction.transaction_hash,
      amount: stellarOperationAmount(transaction),
      from: transaction.source_account,
      to: transaction.account,
      currency: NATIVE_STELLAR_ASSET_CODE,
      timestamp: timestampSecs,
    };
  } else if (transaction.type === 'payment') {
    if (transaction.asset_type !== 'native') return null;
    return {
      hash: transaction.transaction_hash,
      amount: stellarOperationAmount(transaction),
      from: transaction.from,
      to: transaction.to,
      currency: NATIVE_STELLAR_ASSET_CODE,
      timestamp: timestampSecs,
    };
  } else return null;
};

export async function getStellarTransactionInfoFromNetwork(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo> {
  const txData = await getStellarTransactionInfo(
    input.txHash,
    input.toAddress,
    input.amount,
    input.fromAddress,
  );
  if (!txData) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.TRANSACTION_NOT_FOUND),
    );
  }
  await validateTransactionWithInputData(txData, input);
  return txData;
}
