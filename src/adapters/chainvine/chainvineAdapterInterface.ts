export interface NotifyChainVineInputType {
  fromWalletAddress: string;
  amount: number;
  transactionId?: string;
  tokenAddress?: string;
  valueUsd?: number;
  donationId?: number;
}

export interface LinkDonorToChainvineReferrerType {
  referrerId: string;
  walletAddress: string;
}

export interface ChainvineAdapterInterface {
  getWalletAddressFromReferrer(referrerId: string): Promise<string>;
  notifyChainVine(params: NotifyChainVineInputType): Promise<void>;
  registerClickEvent(referrerId: string): Promise<void>;
  linkDonorToReferrer(params: LinkDonorToChainvineReferrerType): Promise<void>;
  generateChainvineId(walletAddress: string): Promise<string | void | null>;
}
