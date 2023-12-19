export interface GetTokenPriceParams {
  symbol: string;
  networkId?: number;
}
export interface PriceAdapterInterface {
  getTokenPrice(params: GetTokenPriceParams): Promise<number>;
}
