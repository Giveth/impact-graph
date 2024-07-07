/**
    * Transak Order Attributes
    {
        "eventID": "ORDER_CREATED",
        "createdAt": "2020-02-17T01:55:05.100Z",
        "webhookData": {
            "id": "9151faa1-e69b-4a36-b959-3c4f894afb68",
            "walletAddress": "0x86349020e9394b2BE1b1262531B0C3335fc32F20",
            "createdAt": "2020-02-17T01:55:05.095Z",
            "status": "AWAITING_PAYMENT_FROM_USER",
            "fiatCurrency": "INR",
            "userId": "65317131-cd95-419a-a50c-747d142f83e9",
            "cryptocurrency": "CDAI",
            "isBuyOrSell": "BUY",
            "fiatAmount": 1110,
            "commissionDecimal": 0.0075,
            "fromWalletAddress": "0x085ee67132ec4297b85ed5d1b4c65424d36fda7d",
            "walletLink": "https://rinkeby.etherscan.io/address/0x86349020e9394b2BE1b1262531B0C3335fc32F20#tokentxns",
            "amountPaid": 0,
            "partnerOrderId": "2183721893",
            "partnerCustomerId": "2183721893",
            "redirectURL": "https://google.com",
            "conversionPrice": 0.663847164368606,
            "cryptoAmount": 731.34,
            "totalFee": 5.52652764336864,
            "paymentOption": [],
            "autoExpiresAt": "2020-02-16T19:55:05-07:00",
            "referenceCode": 226056
        }
    }
*/

export interface TransakOrder {
  eventID:
    | 'ORDER_PROCESSING'
    | 'ORDER_FAILED'
    | 'ORDER_COMPLETED'
    | 'ORDER_PAYMENT_VERIFYING'
    | 'ORDER_CREATED';
  createdAt: Date;
  webhookData: {
    id: string;
    walletAddress: string;
    createdAt: Date;
    status: string;
    fiatCurrency: string;
    userId: string;
    cryptocurrency: string;
    isBuyOrSell: string;
    fiatAmount: number;
    commissionDecimal: number;
    fromWalletAddress: string;
    walletLink: string;
    amountPaid: 0;
    partnerOrderId: string;
    partnerCustomerId: string;
    redirectURL: string;
    conversionPrice: number;
    cryptoAmount: number;
    totalFee: number;
    paymentOption: [];
    autoExpiresAt: Date;
    referenceCode: number;
    transactionLink?: string;
    transactionHash?: string;
  };
}
