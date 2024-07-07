export interface ITxInfo {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

/**
 * sample
 *  {
            "blockNumber": "10099051",
            "timeStamp": "1712000642",
            "hash": "0x1833603bc894448b54cf9c03483fa361508fa101abcfa6c3b6ef51425cab533f",
            "nonce": "2",
            "blockHash": "0xadaebf96e0e469e00379eb014f4defc7265fd5ecb2c7df606dbd138974c9b540",
            "from": "0x0000000000000000000000000000000000000000",
            "contractAddress": "0xda6db863cb2ee39b196edb8159c38a1ed5c55344",
            "to": "0xa1179f64638adb613ddaac32d918eb6beb824104",
            "tokenID": "60697138672961111746906773636285553871149145650772398189596589717428568084291",
            "tokenName": "Constant Outflow NFT",
            "tokenSymbol": "COF",
            "tokenDecimal": "0",
            "transactionIndex": "1",
            "gas": "908400",
            "gasPrice": "1500000252",
            "gasUsed": "691628",
            "cumulativeGasUsed": "735467",
            "input": "deprecated",
            "confirmations": "582530"
        }
 */
export interface IContractCallTxInfo {
  timeStamp: string;
  hash: string;
  to: string;
  contractAddress: string;
  tokenID: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
}
