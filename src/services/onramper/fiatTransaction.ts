/* EXAMPLE PAYLOAD
{
  "type": "transaction_completed",
  "payload": {
    "txId": "WO_63FR9TVRG9",
    "gatewayIdentifier": "Wyre",
    "timestamp": 1624227875007,
    "inCurrency": "EUR",
    "inAmount": 50,
    "outCurrency": "ETH",
    "outAmount": 0.01581851265223089,
    "purchaseAmount": 31.75,
    "partnerContext": {
      "myTxId": "TwQC716Q8D",
      "myUserId": 65165468,
      "lastTab": "wallet-funds"
    }
  }
}
*/

export interface OnRamperFiatTransaction {
  type: 'transaction_completed';
  payload: {
    txId: string;
    gatewayIdentifier: string;
    timestamp: Date;
    inCurrency: string;
    inAmount: string;
    outCurrency: string;
    outAmount: string;
    purchaseAmount: string;
    partnerContext: {
      userId: number;
      userWallet: string;
      projectId: number;
      projectWallet: string;
    };
  };
}
