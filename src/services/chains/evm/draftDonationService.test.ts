import { assert, expect } from 'chai';
import {
  saveProjectDirectlyToDb,
  createProjectData,
  saveUserDirectlyToDb,
} from '../../../../test/testUtils.js';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../../../entities/draftDonation.js';
import { NETWORK_IDS } from '../../../provider.js';
import { ProjectAddress } from '../../../entities/projectAddress.js';
import {
  isAmountWithinTolerance,
  matchDraftDonations,
} from './draftDonationService.js';
import { findUserByWalletAddress } from '../../../repositories/userRepository.js';
import {
  DONATION_ORIGINS,
  DONATION_STATUS,
  Donation,
} from '../../../entities/donation.js';
import { Project, ProjectUpdate } from '../../../entities/project.js';
import { User } from '../../../entities/user.js';

describe.skip('draftDonationMatching', draftDonationMatchingTests);
describe('isAmountWithinTolerance', isAmountWithinToleranceTests);

const RandomAddress1 = '0xf3ddeb5022a6f06b61488b48c90315087ca2beef';
const RandomAddress2 = '0xc42a4791735ae1253c50c6226832e37ede3669f5';

// Native Token Donation Tx exact Time 1707567330
// 0x0643e7008a76feb3c4aa4d127360982eb130163da57cbd9f11e8ce9d5ef828c0
const nativeDonationDraftSaveTime = 1707567300 * 1000;
// Erc20 Donation Tx exact Time 1707567455
// 0x6fb99692292673e24523d832ac805c4438aa23b753e105ce673bc9ceb96d20d2
const erc20DonationDraftSaveTime = 1707567400 * 1000; // a point of time between two transactions
const draftSaveTimeStampMS = Math.min(
  nativeDonationDraftSaveTime,
  erc20DonationDraftSaveTime,
);
const networkId = NETWORK_IDS.XDAI;
const anonymous = false;

const sharedDonationData: Partial<DraftDonation> = {
  networkId,
  status: DRAFT_DONATION_STATUS.PENDING,
  fromWalletAddress: RandomAddress1,
  toWalletAddress: RandomAddress2,
  anonymous,
  createdAt: new Date(draftSaveTimeStampMS),
};
let erc20DonationData: DraftDonation;
let nativeTokenDonationData: DraftDonation;
let project: Project;
let user: User;

function draftDonationMatchingTests() {
  beforeEach(async () => {
    const _user = await findUserByWalletAddress(RandomAddress1);
    // delete all user donations
    if (_user) {
      Donation.delete({ userId: _user.id });
    }
    await DraftDonation.clear();

    const projectAddress = await ProjectAddress.findOne({
      where: { address: RandomAddress2 },
    });
    if (projectAddress) {
      await ProjectAddress.delete({ address: RandomAddress2 });
      await ProjectUpdate.delete({ projectId: projectAddress.projectId });
      await Project.delete(projectAddress.projectId);
    }

    user = await saveUserDirectlyToDb(RandomAddress1);
    project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: RandomAddress2,
    });
    sharedDonationData.projectId = project.id;
    sharedDonationData.userId = user.id;

    erc20DonationData = {
      ...sharedDonationData,
      tokenAddress: '0x4f4f9b8d5b4d0dc10506e5551b0513b61fd59e75',
      amount: 0.01,
      currency: 'GIV',
      anonymous: false,
    } as DraftDonation;
    nativeTokenDonationData = {
      ...sharedDonationData,
      tokenAddress: '0x0000000000000000000000000000000000000000',
      amount: 0.001,
      currency: 'XDAI',
      anonymous: false,
    } as DraftDonation;
  });

  it('should make an ERC20 donatiom by matching draft donation', async () => {
    const draftDonationData = erc20DonationData;
    const draftDonation = await DraftDonation.create(draftDonationData).save();

    expect(draftDonation).to.be.ok;

    await matchDraftDonations({ [RandomAddress1]: [draftDonation!] });

    const { tokenAddress, amount, currency } = draftDonationData;
    const donation = await Donation.findOne({
      where: {
        userId: user.id,
        tokenAddress,
        amount,
        currency,
        projectId: project.id,
        anonymous,
        transactionNetworkId: networkId,
      },
    });

    expect(donation).to.be.ok;

    expect(donation?.transactionId).to.be.ok;
    expect(donation?.status).to.equal(DONATION_STATUS.PENDING);
    expect(donation?.origin).to.equal(DONATION_ORIGINS.DRAFT_DONATION_MATCHING);
  });

  it('should make an native token donatiom by matching draft donation', async () => {
    const draftDonationData = nativeTokenDonationData;
    const draftDonation = await DraftDonation.create(draftDonationData);
    await draftDonation.save();

    expect(draftDonation).to.be.ok;

    await matchDraftDonations({ [RandomAddress1]: [draftDonation!] });

    const { tokenAddress, amount, currency } = draftDonationData;
    const donation = await Donation.findOne({
      where: {
        userId: user.id,
        tokenAddress,
        amount,
        currency,
        projectId: project.id,
        anonymous,
        transactionNetworkId: networkId,
      },
    });

    expect(donation).to.be.ok;

    expect(donation?.transactionId).to.be.ok;
    expect(donation?.status).to.equal(DONATION_STATUS.PENDING);
    expect(donation?.origin).to.equal(DONATION_ORIGINS.DRAFT_DONATION_MATCHING);
  });

  it('should match multiple draft donations', async () => {
    const draftDonation1 = await DraftDonation.create(erc20DonationData).save();
    const draftDonation2 = await DraftDonation.create(
      nativeTokenDonationData,
    ).save();

    await matchDraftDonations({
      [RandomAddress1]: [draftDonation1, draftDonation2],
    });

    const donation1 = await Donation.findOne({
      where: {
        userId: user.id,
        tokenAddress: erc20DonationData.tokenAddress,
        amount: erc20DonationData.amount,
        currency: erc20DonationData.currency,
        projectId: project.id,
        anonymous,
        transactionNetworkId: networkId,
      },
    });

    const donation2 = await Donation.findOne({
      where: {
        userId: user.id,
        tokenAddress: nativeTokenDonationData.tokenAddress,
        amount: nativeTokenDonationData.amount,
        currency: nativeTokenDonationData.currency,
        projectId: project.id,
        anonymous,
        transactionNetworkId: networkId,
      },
    });

    expect(donation1).to.be.ok;
    expect(donation2).to.be.ok;
  });

  it('should not make a donation if the draft donation is already matched', async () => {
    const draftDonationData = erc20DonationData;
    let draftDonation = await DraftDonation.create(draftDonationData).save();
    await matchDraftDonations({ [RandomAddress1]: [draftDonation!] });

    // make draft donation again
    draftDonation = await DraftDonation.create(draftDonationData).save();
    await matchDraftDonations({ [RandomAddress1]: [draftDonation!] });

    await draftDonation.reload();

    expect(draftDonation.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
  });

  it('should not try to match transaction older than minimum created at', async () => {
    const draftDonation1 = await DraftDonation.create({
      ...erc20DonationData,
      createdAt: new Date(),
    }).save();
    const draftDonation2 = await DraftDonation.create({
      ...nativeTokenDonationData,
      createdAt: new Date(erc20DonationDraftSaveTime),
    }).save();

    await matchDraftDonations({
      [RandomAddress1]: [draftDonation1, draftDonation2],
    });

    const erc20Donation = await Donation.findOne({
      where: {
        userId: user.id,
        tokenAddress: erc20DonationData.tokenAddress,
        amount: erc20DonationData.amount,
        currency: erc20DonationData.currency,
        projectId: project.id,
        anonymous,
        transactionNetworkId: networkId,
      },
    });

    const donation2 = await Donation.findOne({
      where: {
        userId: user.id,
        tokenAddress: nativeTokenDonationData.tokenAddress,
        amount: nativeTokenDonationData.amount,
        currency: nativeTokenDonationData.currency,
        projectId: project.id,
        anonymous,
        transactionNetworkId: networkId,
      },
    });

    expect(erc20Donation).to.be.ok;
    expect(donation2).to.not.be.ok;
  });
}

function isAmountWithinToleranceTests() {
  it(`should return true for 40.5555 (405555) (0xa9059cbb000000000000000000000000b4964e1eca55db36a94e8aeffbfbab48529a2f6c00000000000000000000000000000000000000000000000000000000026ad3ec)
   and 40.555499 (40555499)(0xa9059cbb000000000000000000000000b4964e1eca55db36a94e8aeffbfbab48529a2f6c00000000000000000000000000000000000000000000000000000000026ad3eb)
   `, () => {
    // https://gnosisscan.io/tx/0xfa65ef0a52e2f3b96c5802dcee4783858511989b7235035e8cab4d527fa15a1a
    assert.isTrue(
      isAmountWithinTolerance(
        '0xa9059cbb000000000000000000000000b4964e1eca55db36a94e8aeffbfbab48529a2f6c00000000000000000000000000000000000000000000000000000000026ad3ec',
        '0xa9059cbb000000000000000000000000b4964e1eca55db36a94e8aeffbfbab48529a2f6c00000000000000000000000000000000000000000000000000000000026ad3eb',
        // Tether Decimals is 6
        6,
      ),
    );
  });

  it(`should return false for 40.5555 (405555) (0xa9059cbb000000000000000000000000b4964e1eca55db36a94e8aeffbfbab48529a2f6c00000000000000000000000000000000000000000000000000000000026ad3ec)
   and 40.550571 (40550571)(0xa9059cbb000000000000000000000000b4964e1eca55db36a94e8aeffbfbab48529a2f6c00000000000000000000000000000000000000000000000000000000026ac0ab)
   `, () => {
    // https://gnosisscan.io/tx/0xfa65ef0a52e2f3b96c5802dcee4783858511989b7235035e8cab4d527fa15a1a
    assert.isFalse(
      isAmountWithinTolerance(
        '0xa9059cbb000000000000000000000000b4964e1eca55db36a94e8aeffbfbab48529a2f6c00000000000000000000000000000000000000000000000000000000026ad3ec',
        '0xa9059cbb000000000000000000000000b4964e1eca55db36a94e8aeffbfbab48529a2f6c00000000000000000000000000000000000000000000000000000000026ac0ab',
        // Tether Decimals is 6
        6,
      ),
    );
  });
}
