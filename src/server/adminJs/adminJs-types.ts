import { User } from '../../entities/user';
import { ReviewStatus } from '../../entities/project';

export interface AdminJsContextInterface {
  h: any;
  resource: any;
  records: any[];
  record?: any;
  currentAdmin: User;
  payload?: any;
}

export interface AdminJsRequestInterface {
  payload?: any;
  record?: any;
  query?: {
    recordIds?: string;
  };
  params?: {
    recordId?: string;
  };
}

export interface AdminJsProjectsQuery {
  statusId?: string;
  title?: string;
  slug?: string;
  verified?: string;
  // listed?: string;
  isImported?: string;
  reviewStatus?: ReviewStatus;
}

export interface AdminJsDonationsQuery {
  id?: string;
  projectId?: string;
  contactEmail?: string;
  referrerWallet?: string;
  userId?: string;
  fromWalletAddress?: string;
  toWalletAddress?: string;
  status?: string;
  createdAt?: string;
  currency?: string;
  transactionNetworkId?: string;
  isProjectGivbackEligible?: string;
  qfRoundId?: string;
}

// headers defined by the verification team for exporting
export const projectHeaders = [
  'id',
  'title',
  'slug',
  'adminUserId',
  'creationDate',
  'updatedAt',
  'impactLocation',
  'walletAddress',
  'statusId',
  'qualityScore',
  'verified',
  'listed',
  'reviewStatus',
  'totalDonations',
  'totalProjectUpdates',
  'website',
  'email',
  'firstWalletAddress',
  'firstWalletAddressNetwork',
  'secondWalletAddress',
  'secondWalletAddressNetwork',
];

export const donationHeaders = [
  'id',
  'transactionId',
  'transactionNetworkId',
  'isProjectGivbackEligible',
  'status',
  'toWalletAddress',
  'fromWalletAddress',
  'tokenAddress',
  'currency',
  'anonymous',
  'amount',
  'isFiat',
  'isCustomToken',
  'valueEth',
  'valueUsd',
  'priceEth',
  'priceUsd',
  'projectId',
  'userId',
  'contactEmail',
  'createdAt',
  'referrerWallet',
  'isTokenEligibleForGivback',
  'qfRoundId',
  'qfRoundUserScore',
];
