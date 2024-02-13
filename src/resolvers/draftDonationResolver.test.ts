import { assert, expect } from 'chai';
import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
  DONATION_SEED_DATA,
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEvmTxHash,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  createDonationData,
  saveUserDirectlyToDb,
  generateUserIdLessAccessToken,
  generateRandomSolanaAddress,
  generateRandomSolanaTxHash,
} from '../../test/testUtils';
import axios from 'axios';
import { errorMessages } from '../utils/errorMessages';
import { Donation, DONATION_STATUS } from '../entities/donation';
import {
  fetchDonationsByUserIdQuery,
  fetchDonationsByDonorQuery,
  fetchDonationsByProjectIdQuery,
  fetchAllDonationsQuery,
  donationsToWallets,
  donationsFromWallets,
  createDonationMutation,
  updateDonationStatusMutation,
  fetchTotalDonationsUsdAmount,
  fetchTotalDonors,
  fetchTotalDonationsPerCategoryPerDate,
  fetchRecentDonations,
  fetchTotalDonationsNumberPerDateRange,
  doesDonatedToProjectInQfRoundQuery,
  createDraftDonationMutation,
} from '../../test/graphqlQueries';
import { NETWORK_IDS } from '../provider';
import { User } from '../entities/user';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { ProjStatus, ReviewStatus } from '../entities/project';
import { Token } from '../entities/token';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from '../repositories/powerBoostingRepository';
import { setPowerRound } from '../repositories/powerRoundRepository';
import { refreshProjectPowerView } from '../repositories/projectPowerViewRepository';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { AppDataSource } from '../orm';
import { generateRandomString } from '../utils/utils';
import { ChainvineMockAdapter } from '../adapters/chainvine/chainvineMockAdapter';
import { getChainvineAdapter } from '../adapters/adaptersFactory';
import { firstOrCreateReferredEventByUserId } from '../repositories/referredEventRepository';
import { QfRound } from '../entities/qfRound';
import { findProjectById } from '../repositories/projectRepository';
import { addOrUpdatePowerSnapshotBalances } from '../repositories/powerBalanceSnapshotRepository';
import { findPowerSnapshots } from '../repositories/powerSnapshotRepository';
import { ChainType } from '../types/network';
import { getDefaultSolanaChainId } from '../services/chains';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

describe('createDonation() test cases', createDonationTestCases);

function createDonationTestCases() {
  it('create simple draft donation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const referrerId = generateRandomString();

    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    const tokenAddress = generateRandomEtheriumAddress();
    const accessToken = await generateTestAccessToken(user.id);
    const safeTransactionId = generateRandomEvmTxHash();

    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.XDAI,
          amount: 10,
          token: 'GIV',
          referrerId,
          tokenAddress,
          safeTransactionId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDraftDonation);
    const draftDonation = await DraftDonation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDraftDonation,
      },
    });

    expect(draftDonation).deep.contain({
      networkId: NETWORK_IDS.XDAI,
      chainType: ChainType.EVM,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: project.walletAddress!,
      fromWalletAddress: user.walletAddress!,
      tokenAddress,
      currency: 'GIV',
      anonymous: false,
      amount: 10,
      referrerId,
      projectId: project.id,
      userId: user.id,
    });
  });
}
