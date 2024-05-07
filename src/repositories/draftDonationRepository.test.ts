// Create a draft donation

import { assert, expect } from 'chai';
import { generateRandomEtheriumAddress } from '../../test/testUtils';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';
import {
  countPendingDraftDonations,
  delecteExpiredDraftDonations,
  markDraftDonationStatusMatched,
} from './draftDonationRepository';

// Mark the draft donation as matched
describe('draftDonationRepository', () => {
  beforeEach(async () => {
    await DraftDonation.clear();
  });

  it('should mark a draft donation as matched', async () => {
    // Setup
    const matchedDontionId = 9999;
    const draftDonation = await DraftDonation.create({
      networkId: 1,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: generateRandomEtheriumAddress(),
      tokenAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      anonymous: false,
      amount: 0.01,
    });

    await draftDonation.save();

    await markDraftDonationStatusMatched({
      matchedDonationId: matchedDontionId,
      fromWalletAddress: draftDonation.fromWalletAddress,
      toWalletAddress: draftDonation.toWalletAddress,
      networkId: draftDonation.networkId,
      currency: draftDonation.currency,
      amount: draftDonation.amount,
    });

    const updatedDraftDonation = await DraftDonation.findOne({
      where: {
        id: draftDonation.id,
        matchedDonationId: matchedDontionId,
      },
    });

    expect(updatedDraftDonation?.status).equal(DRAFT_DONATION_STATUS.MATCHED);
    expect(updatedDraftDonation?.matchedDonationId).equal(matchedDontionId);
  });

  it('should clear expired draft donations', async () => {
    // create a draft donation with createdAt two hours ago, and one with createdAt one hour ago
    await DraftDonation.create({
      networkId: 1,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: generateRandomEtheriumAddress(),
      tokenAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      anonymous: false,
      amount: 1,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    }).save();

    await DraftDonation.create({
      networkId: 1,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: generateRandomEtheriumAddress(),
      tokenAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      anonymous: false,
      amount: 1,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    }).save();

    await delecteExpiredDraftDonations(1.5);

    const count = await DraftDonation.createQueryBuilder().getCount();

    expect(count).equal(1);
  });
});

describe(
  'countPendingDraftDonations() test cases',
  countPendingDraftDonationsTestCase,
);

function countPendingDraftDonationsTestCase() {
  beforeEach(async () => {
    await DraftDonation.clear();
  });
  it('should return draft pending donations count correctly', async () => {
    await DraftDonation.create({
      networkId: 1,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: generateRandomEtheriumAddress(),
      tokenAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      anonymous: false,
      amount: 1,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    }).save();
    await DraftDonation.create({
      networkId: 1,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: generateRandomEtheriumAddress(),
      tokenAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      anonymous: false,
      amount: 1,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    }).save();
    await DraftDonation.create({
      networkId: 1,
      status: DRAFT_DONATION_STATUS.MATCHED,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: generateRandomEtheriumAddress(),
      tokenAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      anonymous: false,
      amount: 1,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    }).save();

    const pendingDraftDonationsCount = await countPendingDraftDonations();
    assert.equal(pendingDraftDonationsCount, 2);
  });
}
