import { User } from '../../entities/user';
import { ReviewStatus } from '../../entities/project';

export interface AdminJsContextInterface {
  h: any;
  resource: any;
  records: any[];
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
  reviewStatus: ReviewStatus;
}

// headers defined by the verification team for exporting
export const headers = [
  'id',
  'title',
  'slug',
  'admin',
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
