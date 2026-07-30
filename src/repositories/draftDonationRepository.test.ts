// Create a draft donation

import fs from 'fs';
import path from 'path';
import { assert, expect } from 'chai';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';
import { DONATION_STATUS } from '../entities/donation';
import { AppDataSource } from '../orm';
import {
  countPendingDraftDonations,
  delecteExpiredDraftDonations,
  markDraftDonationStatusMatched,
  updateDraftDonationStatus,
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

describe(
  'updateDraftDonationStatus() test cases',
  updateDraftDonationStatusTestCases,
);

describe(
  'scripts/reconcile-failed-qr-drafts.sql test cases',
  reconcileFailedQrDraftsSqlTestCases,
);

function updateDraftDonationStatusTestCases() {
  beforeEach(async () => {
    await DraftDonation.clear();
  });

  function createQrDraft(overrides: Partial<DraftDonation> = {}) {
    return DraftDonation.create({
      networkId: 1500,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: '',
      currency: 'XLM',
      anonymous: false,
      amount: 10,
      isQRDonation: true,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ...overrides,
    }).save();
  }

  it('should mark a pending draft donation as failed', async () => {
    const draft = await createQrDraft();

    const updated = await updateDraftDonationStatus({
      donationId: draft.id,
      status: DRAFT_DONATION_STATUS.FAILED,
      source: 'test',
    });

    assert.isTrue(updated);
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    assert.equal(fresh?.status, DRAFT_DONATION_STATUS.FAILED);
  });

  it('should never mark a matched draft donation as failed', async () => {
    const draft = await createQrDraft({
      status: DRAFT_DONATION_STATUS.MATCHED,
      matchedDonationId: 12345,
    });

    const updated = await updateDraftDonationStatus({
      donationId: draft.id,
      status: DRAFT_DONATION_STATUS.FAILED,
      source: 'test',
    });

    assert.isFalse(updated);
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    assert.equal(fresh?.status, DRAFT_DONATION_STATUS.MATCHED);
    assert.equal(fresh?.matchedDonationId, 12345);
  });

  it('should never fail a draft whose matchedDonationId references a live donation, even if still pending', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      undefined,
      project.id,
    );
    const draft = await createQrDraft({
      matchedDonationId: donation.id,
    });

    const updated = await updateDraftDonationStatus({
      donationId: draft.id,
      status: DRAFT_DONATION_STATUS.FAILED,
      source: 'test',
    });

    assert.isFalse(updated);
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    assert.equal(fresh?.status, DRAFT_DONATION_STATUS.PENDING);
    assert.equal(fresh?.matchedDonationId, donation.id);
  });

  it('should never fail a draft whose matchedDonationId references a pending (live) donation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.PENDING }),
      undefined,
      project.id,
    );
    const draft = await createQrDraft({
      matchedDonationId: donation.id,
    });

    const updated = await updateDraftDonationStatus({
      donationId: draft.id,
      status: DRAFT_DONATION_STATUS.FAILED,
      source: 'test',
    });

    assert.isFalse(updated);
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    assert.equal(fresh?.status, DRAFT_DONATION_STATUS.PENDING);
    assert.equal(fresh?.matchedDonationId, donation.id);
  });

  it('should fail a pending draft whose matchedDonationId references a failed donation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.FAILED }),
      undefined,
      project.id,
    );
    const draft = await createQrDraft({
      matchedDonationId: donation.id,
    });

    const updated = await updateDraftDonationStatus({
      donationId: draft.id,
      status: DRAFT_DONATION_STATUS.FAILED,
      source: 'test',
    });

    assert.isTrue(updated);
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    assert.equal(fresh?.status, DRAFT_DONATION_STATUS.FAILED);
    assert.equal(fresh?.matchedDonationId, donation.id);
  });

  it('should not fail a draft whose expiresAt was renewed (expiresBefore condition)', async () => {
    const draft = await createQrDraft({
      // Renewed: expires in the future
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // A stale job believes the draft is expired and tries to fail it
    const updated = await updateDraftDonationStatus({
      donationId: draft.id,
      status: DRAFT_DONATION_STATUS.FAILED,
      expiresBefore: new Date(Date.now() - 60 * 1000),
      source: 'test',
    });

    assert.isFalse(updated);
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    assert.equal(fresh?.status, DRAFT_DONATION_STATUS.PENDING);
  });

  it('should reconcile a failed draft back to matched', async () => {
    const fromWalletAddress = generateRandomEtheriumAddress();
    const draft = await createQrDraft({
      status: DRAFT_DONATION_STATUS.FAILED,
    });

    const updated = await updateDraftDonationStatus({
      donationId: draft.id,
      status: DRAFT_DONATION_STATUS.MATCHED,
      fromWalletAddress,
      matchedDonationId: 777,
      source: 'reconciliation',
    });

    assert.isTrue(updated);
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    assert.equal(fresh?.status, DRAFT_DONATION_STATUS.MATCHED);
    assert.equal(fresh?.matchedDonationId, 777);
    assert.equal(fresh?.fromWalletAddress, fromWalletAddress);
  });

  it('should skip matching an already matched draft (idempotent)', async () => {
    const draft = await createQrDraft({
      status: DRAFT_DONATION_STATUS.MATCHED,
      matchedDonationId: 111,
    });

    const updated = await updateDraftDonationStatus({
      donationId: draft.id,
      status: DRAFT_DONATION_STATUS.MATCHED,
      matchedDonationId: 222,
      source: 'test',
    });

    assert.isFalse(updated);
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    assert.equal(fresh?.matchedDonationId, 111);
  });

  it('should return false for a non-existent draft', async () => {
    const updated = await updateDraftDonationStatus({
      donationId: 999999999,
      status: DRAFT_DONATION_STATUS.FAILED,
      source: 'test',
    });
    assert.isFalse(updated);
  });
}

function reconcileFailedQrDraftsSqlTestCases() {
  // Only the UPDATE statement is executed here; the file's leading SELECT is
  // the manual inspection step for staging/production runs.
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      'scripts',
      'reconcile-failed-qr-drafts.sql',
    ),
    'utf8',
  );
  const updateSql = sql.slice(sql.indexOf('UPDATE draft_donation'));

  beforeEach(async () => {
    await DraftDonation.clear();
  });

  function createQrDraft(overrides: Partial<DraftDonation> = {}) {
    return DraftDonation.create({
      networkId: 1500,
      status: DRAFT_DONATION_STATUS.FAILED,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: '',
      currency: 'XLM',
      anonymous: false,
      amount: 10,
      isQRDonation: true,
      expiresAt: new Date(Date.now() - 15 * 60 * 1000),
      ...overrides,
    }).save();
  }

  it('repairs failed QR drafts referencing non-failed donations, is idempotent, and leaves the rest alone', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const verifiedDonation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      undefined,
      project.id,
    );
    const pendingDonation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.PENDING }),
      undefined,
      project.id,
    );
    const failedDonation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.FAILED }),
      undefined,
      project.id,
    );

    // Repairable: failed draft, live donation, empty fromWalletAddress.
    const repairable = await createQrDraft({
      matchedDonationId: verifiedDonation.id,
    });
    // Repairable via the non-failed rule, but its own address must be kept.
    const withOwnAddress = await createQrDraft({
      matchedDonationId: pendingDonation.id,
      fromWalletAddress: generateRandomEtheriumAddress(),
    });
    // Genuinely failed on-chain: must never be converted.
    const genuinelyFailed = await createQrDraft({
      matchedDonationId: failedDonation.id,
    });
    // Not failed: must not be touched.
    const stillPending = await createQrDraft({
      status: DRAFT_DONATION_STATUS.PENDING,
      matchedDonationId: verifiedDonation.id,
    });

    await AppDataSource.getDataSource().query(updateSql);
    // Idempotency: a second run changes nothing further.
    await AppDataSource.getDataSource().query(updateSql);

    const freshRepairable = await DraftDonation.findOne({
      where: { id: repairable.id },
    });
    assert.equal(freshRepairable?.status, DRAFT_DONATION_STATUS.MATCHED);
    assert.equal(
      freshRepairable?.fromWalletAddress,
      verifiedDonation.fromWalletAddress,
    );

    const freshWithOwnAddress = await DraftDonation.findOne({
      where: { id: withOwnAddress.id },
    });
    assert.equal(freshWithOwnAddress?.status, DRAFT_DONATION_STATUS.MATCHED);
    assert.equal(
      freshWithOwnAddress?.fromWalletAddress,
      withOwnAddress.fromWalletAddress,
    );

    const freshGenuinelyFailed = await DraftDonation.findOne({
      where: { id: genuinelyFailed.id },
    });
    assert.equal(freshGenuinelyFailed?.status, DRAFT_DONATION_STATUS.FAILED);

    const freshStillPending = await DraftDonation.findOne({
      where: { id: stillPending.id },
    });
    assert.equal(freshStillPending?.status, DRAFT_DONATION_STATUS.PENDING);
  });
}

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
