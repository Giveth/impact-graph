export interface GetTokenPriceParams {
  symbol: string;
  networkId: number;
}

export interface GetTokenPriceAtDateParams {
  symbol: string;
  date: string;
}

export interface PriceAdapterInterface {
  getTokenPrice(params: GetTokenPriceParams): Promise<number>;
}
