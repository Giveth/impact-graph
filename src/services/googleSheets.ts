import { GoogleSpreadsheet } from 'google-spreadsheet';
import moment from 'moment';
import config from '../config';
import { logger } from '../utils/logger';
import { ReviewStatus } from '../entities/project';

interface ProjectExport {
  id: number;
  title: string;
  slug?: string | null;
  admin?: string | null;
  creationDate: Date;
  updatedAt: Date;
  impactLocation?: string | null;
  walletAddress?: string | null;
  statusId: number;
  qualityScore: number;
  verified: boolean;
  listed: boolean;
  reviewStatus: ReviewStatus;
  totalDonations: number;
  totalProjectUpdates: number;
  website: string;
  email: string;
  firstWalletAddress: string;
  firstWalletAddressNetwork: string;
  secondWalletAddress: string;
  secondWalletAddressNetwork: string;
}
export interface QfRoundDonationRow {
  projectName: string;
  // Pattern is networkId-projectAddress,... Example: 1-0x123...456,10,ETH,0x123...456
  addresses?: string;
  link: string;
  allUsdReceived?: number;
  allUsdReceivedAfterSybilsAnalysis?: number;
  totalDonors: number;

  // We can have 20 donors but after sybils analysis we can have 15 unique donors
  uniqueDonors: number;
  realMatchingFund: number;
  projectWeight?: number;

  donationIdsBeforeAnalysis: string;
  donationIdsAfterAnalysis: string;
  totalValuesOfUserDonationsAfterAnalysis: string;
  uniqueUserIdsAfterAnalysis: string;
}

interface DonationExport {
  id: number;
  transactionId: string;
  transactionNetworkId: number;
  isProjectVerified: boolean;
  status: string;
  toWalletAddress: string;
  fromWalletAddress: string;
  tokenAddress: string;
  currency: string;
  anonymous: boolean;
  amount: number;
  isFiat: boolean;
  isCustomToken: boolean;
  valueEth: number;
  valueUsd: number;
  priceEth: number;
  priceUsd: number;
  projectId: string | number;
  userId: string | number;
  contactEmail: string;
  createdAt: string;
  referrerWallet: string | null;
  isTokenEligibleForGivback: boolean;
}

export const initExportSpreadsheet = async (): Promise<
  typeof GoogleSpreadsheet
> => {
  // Initialize the sheet - document ID is the long id in the sheets URL
  const spreadSheet = new GoogleSpreadsheet(
    config.get('GOOGLE_PROJECT_EXPORTS_SPREADSHEET_ID'),
  );

  // Initialize Auth - see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
  await spreadSheet.useServiceAccountAuth({
    // env var values are copied from service account credentials generated by google
    // see "Authentication" section in docs for more info
    client_email: config.get('GOOGLE_SPREADSHEETS_CLIENT_EMAIL'),
    private_key: config.get('GOOGLE_SPREADSHEETS_PRIVATE_KEY'),
  });

  return spreadSheet;
};

const initQfRoundDonationsSpreadsheet = async (): Promise<
  typeof GoogleSpreadsheet
> => {
  // Initialize the sheet - document ID is the long id in the sheets URL
  const spreadSheet = new GoogleSpreadsheet(
    config.get('QF_ROUND_DONATIONS_GOOGLE_SPREADSHEET_ID'),
  );

  // Initialize Auth - see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
  await spreadSheet.useServiceAccountAuth({
    // env var values are copied from service account credentials generated by google
    // see "Authentication" section in docs for more info
    client_email: config.get('QF_ROUND_GOOGLE_SPREADSHEETS_CLIENT_EMAIL'),
    private_key: config.get('QF_ROUND_GOOGLE_SPREADSHEETS_PRIVATE_KEY'),
  });

  return spreadSheet;
};

export const addDonationsSheetToSpreadsheet = async (
  spreadSheet: GoogleSpreadsheet,
  headers: string[],
  rows: DonationExport[],
): Promise<void> => {
  try {
    const currentDate = moment().toDate();

    const sheet = await spreadSheet.addSheet({
      headerValues: headers,
      title: `Donations ${currentDate.toDateString()} ${currentDate.getTime()}`,
    });
    await sheet.addRows(rows);
  } catch (e) {
    logger.error('addDonationsSheetToSpreadsheet error', e);
    throw e;
  }
};

export const addProjectsSheetToSpreadsheet = async (
  spreadSheet: GoogleSpreadsheet,
  headers: string[],
  rows: ProjectExport[],
): Promise<void> => {
  try {
    const currentDate = moment().toDate();

    const sheet = await spreadSheet.addSheet({
      headerValues: headers,
      title: `Projects ${currentDate.toDateString()} ${currentDate.getTime()}`,
    });
    await sheet.addRows(rows);
  } catch (e) {
    logger.error('addProjectsSheetToSpreadsheet error', e);
    throw e;
  }
};

export const addQfRoundDonationsSheetToSpreadsheet = async (params: {
  rows: QfRoundDonationRow[];
  qfRoundId: number;
}): Promise<void> => {
  try {
    const spreadSheet = await initQfRoundDonationsSpreadsheet();

    const currentDate = moment().toDate();

    const headers = [
      'projectName',
      'addresses',
      'link',
      'allUsdReceived',
      'allUsdReceivedAfterSybilsAnalysis',
      'totalDonors',
      'uniqueDonors',
      'realMatchingFund',
      'projectWeight',
      'donationIdsBeforeAnalysis',
      'donationIdsAfterAnalysis',
      'totalValuesOfUserDonationsAfterAnalysis',
      'uniqueUserIdsAfterAnalysis',
    ];
    const { rows, qfRoundId } = params;

    const sheet = await spreadSheet.addSheet({
      headerValues: headers,
      title: `QfRound -${qfRoundId} - ${currentDate.toDateString()} ${currentDate.getTime()}`,
    });
    logger.debug('addQfRoundDonationsSheetToSpreadsheet', params);
    await sheet.addRows(rows);
  } catch (e) {
    logger.error('addQfRoundDonationsSheetToSpreadsheet error', e);
    throw e;
  }
};
