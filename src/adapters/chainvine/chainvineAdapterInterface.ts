export interface NotifyChainVineInputType {
  fromWalletAddress: string;
  amount: number;
  transactionId?: string;
  tokenAddress?: string;
  valueUsd?: number;
  donationId?: number;
}
export interface ChainvineAdapterInterface {
  getWalletAddressFromReferer(referrerId: string): Promise<string>;
  notifyChainVine(params: NotifyChainVineInputType): Promise<void>;
  getReferralStartTimestamp(walletAddress: string): Promise<string | void>;
}
