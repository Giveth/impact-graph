// Shared knowledge about Stellar Horizon operation records, used by both the
// QR draft matcher (checkQRTransactionJob) and donation verification
// (transactionService) so the two layers can never disagree about which
// operation pays an address or how much it transferred. Add new operation
// shapes (e.g. path_payment_strict_send) here, never inline at a call site.

// Whether this Horizon operation record delivers funds to `address`.
// Addresses are compared case-insensitively deliberately: Stellar strkeys
// are canonically uppercase, but stored wallet addresses are user-supplied
// and must mean the same account in every layer regardless of casing.
// Module-private: callers go through isNativeStellarDeposit below.
const stellarOperationPaysAddress = (record: any, address: string): boolean => {
  const recipient =
    record?.type === 'payment'
      ? record.to
      : record?.type === 'create_account'
        ? record.account
        : undefined;
  return (
    typeof recipient === 'string' &&
    recipient.toLowerCase() === address.toLowerCase()
  );
};

// What this operation actually transferred on-chain: payments carry
// `amount`, create_account carries `starting_balance`. An unknown operation
// type (or a malformed record) yields NaN, which callers must treat as
// "not a usable operation".
export const stellarOperationAmount = (record: any): number =>
  record?.type === 'create_account'
    ? Number(record.starting_balance)
    : Number(record?.amount);

// The full "is this operation a usable XLM deposit to `address`" predicate:
// the operation-type whitelist (native payments and create_account), the
// recipient check, and a parseable amount, in one place — so the QR matcher
// and donation verification can never disagree about which operations count.
export const isNativeStellarDeposit = (record: any, address: string): boolean =>
  (record?.type === 'payment'
    ? record.asset_type === 'native'
    : record?.type === 'create_account') &&
  stellarOperationPaysAddress(record, address) &&
  Number.isFinite(stellarOperationAmount(record));

// The shared tie-breaking rule for which operation of one transaction a
// donation refers to: the largest transferred amount. Callers layer their
// own higher-priority keys on top (the QR matcher ranks successful
// transactions first; verification prefers the amount closest to the
// donation being verified).
export const byLargestStellarOperation = (a: any, b: any): number =>
  stellarOperationAmount(b) - stellarOperationAmount(a);
