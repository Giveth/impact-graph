export interface GetTokenPriceParams {
  symbol: string;
  networkId: number;
}

export interface GetTokenPriceAtDateParams {
  symbol: string;
  date: Date;
}

export interface PriceAdapterInterface {
  getTokenPrice(params: GetTokenPriceParams): Promise<number>;
}
