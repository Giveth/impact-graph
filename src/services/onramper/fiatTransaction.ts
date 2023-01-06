/* EXAMPLE PAYLOAD
{
  "type": "transaction_completed" or "transaction_pending",
  "summary": "",
  "payload": {
    "onramperTxId": "xxxxxxxxxxxxx",
    "txId": "xxxxxxxxxxx", (usable in onramper UI)
    "gatewayIdentifier": "Transak", (many different gateways, not important)
    "timestamp": 1669671063842,
    "inCurrency": "CHF", (not important to save)
    "inAmount": 29,
    "outCurrency": "ETH", (save this)
    "outAmount": 0.02347075,
    "medium": "creditCard",

    // could be a json string or object, consider both
    "partnerContext": "{\"userId\":\"66\",\"userWallet\":\"0x00d18ca9782be1caef611017c2fbc1a39779a57c\",\"projectWallet\":\"0x76a1F47f8d998D07a15189a07d9aADA180E09aC6\",\"projectId\":\"71\"}",

    "wallet": "0x76a1F47f8d998D07a15189a07d9aADA180E09aC6", (not important)

    // transaction Hash only when completed it arrives
    "txHash": "0x914557b20101eea80f6260511ad2698061a940a1e9ef0c2d35aac85ef62a8aac"
  }
}
*/

// set as optional ?, non required values or values that arrive later
export interface OnRamperFiatTransaction {
  type: 'transaction_completed' | 'transaction_pending';
  summary?: string;
  payload: {
    onramperTxId?: string;
    txId: string;
    gatewayIdentifier?: string;
    timestamp: Date;
    inCurrency?: string;
    inAmount?: string;
    outCurrency: string;
    outAmount: string;
    purchaseAmount?: string;
    partnerContext: string | OnRamperMetadata;
    wallet?: string;
    txHash?: string;
  };
}

export interface OnRamperMetadata {
  userId: string;
  userWallet: string;
  projectId: string;
  projectWallet: string;
  anonymous: string;
  email: string;
}
