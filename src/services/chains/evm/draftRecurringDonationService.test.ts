import { expect } from 'chai';
import {
  saveProjectDirectlyToDb,
  createProjectData,
  saveUserDirectlyToDb,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveRecurringDonationDirectlyToDb,
} from '../../../../test/testUtils.js';
import { NETWORK_IDS } from '../../../provider.js';
import { Project } from '../../../entities/project.js';
import { User } from '../../../entities/user.js';
import {
  DraftRecurringDonation,
  RECURRING_DONATION_ORIGINS,
} from '../../../entities/draftRecurringDonation.js';
import { AnchorContractAddress } from '../../../entities/anchorContractAddress.js';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../../../entities/recurringDonation.js';
import { addNewAnchorAddress } from '../../../repositories/anchorContractAddressRepository.js';
import { matchDraftRecurringDonations } from './draftRecurringDonationService.js';

describe('matchDraftRecurringDonations', matchDraftRecurringDonationsTests);

function matchDraftRecurringDonationsTests() {
  let project1: Project;
  let anchorContractAddress1: AnchorContractAddress;
  let user1: User;

  beforeEach(async () => {
    project1 = await saveProjectDirectlyToDb(createProjectData());

    user1 = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    anchorContractAddress1 = await addNewAnchorAddress({
      project: project1,
      owner: user1,
      creator: user1,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      txHash: generateRandomEvmTxHash(),
    });
  });

  afterEach(async () => {
    await DraftRecurringDonation.delete({});
    await RecurringDonation.delete({});
    await AnchorContractAddress.delete({});
  });

  it('should create a recurring donation based on the draft donation OP Sepholia  #1', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10
    const user = await saveUserDirectlyToDb(
      '0x871Cd6353B803CECeB090Bb827Ecb2F361Db81AB',
    );
    const txHash =
      '0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10';
    anchorContractAddress1.address =
      '0x1190f5ac0f509d8f3f4b662bf17437d37d64527c';
    anchorContractAddress1.isActive = true;
    await anchorContractAddress1.save();

    const draftRecurringDonation = await DraftRecurringDonation.create({
      projectId: project1!.id,
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      currency: 'ETH',
      donorId: user!.id,
      flowRate: '285225986',
    }).save();
    const oneSecEarlierThanTx = new Date(1711283035000);
    draftRecurringDonation.createdAt = oneSecEarlierThanTx;
    await draftRecurringDonation.save();

    expect(draftRecurringDonation).to.be.ok;

    await matchDraftRecurringDonations([draftRecurringDonation!]);

    const recurringDonation = await RecurringDonation.findOne({
      where: {
        txHash,
      },
    });

    const updatedDraftDonation = await DraftRecurringDonation.findOne({
      where: {
        id: draftRecurringDonation.id,
      },
    });

    expect(recurringDonation).to.be.ok;

    expect(recurringDonation?.txHash).to.be.equal(txHash);
    expect(recurringDonation?.status).to.equal(
      RECURRING_DONATION_STATUS.PENDING,
    );
    expect(recurringDonation?.origin).to.equal(
      RECURRING_DONATION_ORIGINS.DRAFT_RECURRING_DONATION_MATCHING,
    );
    expect(updatedDraftDonation?.matchedRecurringDonationId).to.equal(
      recurringDonation?.id,
    );
  });

  it('should create a recurring donation based on the draft donation OP Sepholia  #1, update existing', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10
    const user = await saveUserDirectlyToDb(
      '0x871Cd6353B803CECeB090Bb827Ecb2F361Db81AB',
    );
    const txHash =
      '0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10';
    anchorContractAddress1.address =
      '0x1190f5ac0f509d8f3f4b662bf17437d37d64527c';
    anchorContractAddress1.isActive = true;
    await anchorContractAddress1.save();

    const existingRecurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        txHash: generateRandomEvmTxHash(),
        projectId: project1!.id,
        networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
        currency: 'ETH',
        donorId: user!.id,
        flowRate: '11111',
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    const draftRecurringDonation = await DraftRecurringDonation.create({
      projectId: project1!.id,
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      matchedRecurringDonationId: existingRecurringDonation.id,
      isForUpdate: true,
      currency: 'ETH',
      donorId: user!.id,
      flowRate: '285225986',
    }).save();

    const oneSecEarlierThanTx = new Date(1711283035000);
    draftRecurringDonation.createdAt = oneSecEarlierThanTx;
    await draftRecurringDonation.save();

    expect(draftRecurringDonation).to.be.ok;

    await matchDraftRecurringDonations([draftRecurringDonation!]);

    const recurringDonation = await RecurringDonation.findOne({
      where: {
        txHash,
      },
    });

    const updatedDraftDonation = await DraftRecurringDonation.findOne({
      where: {
        id: draftRecurringDonation.id,
      },
    });

    expect(recurringDonation).to.be.ok;

    expect(recurringDonation?.txHash).to.be.equal(txHash);
    expect(recurringDonation?.flowRate).to.be.equal(
      draftRecurringDonation.flowRate,
    );
    expect(recurringDonation?.status).to.equal(
      RECURRING_DONATION_STATUS.PENDING,
    );
    expect(recurringDonation?.origin).to.equal(
      RECURRING_DONATION_ORIGINS.DRAFT_RECURRING_DONATION_MATCHING,
    );
    expect(updatedDraftDonation?.matchedRecurringDonationId).to.equal(
      recurringDonation?.id,
    );
  });

  it('should create a recurring donation based on the draft donation OP Sepholia  #2 batch', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x1833603bc894448b54cf9c03483fa361508fa101abcfa6c3b6ef51425cab533f
    const user = await saveUserDirectlyToDb(
      '0xa1179f64638adb613ddaac32d918eb6beb824104',
    );
    const txHash =
      '0x1833603bc894448b54cf9c03483fa361508fa101abcfa6c3b6ef51425cab533f';
    anchorContractAddress1.address =
      '0xe6375bc298aEB29D173B2AB359D492439A43b268';
    anchorContractAddress1.isActive = true;
    await anchorContractAddress1.save();

    const draftRecurringDonation = await DraftRecurringDonation.create({
      projectId: project1!.id,
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      currency: 'ETH',
      donorId: user!.id,
      flowRate: '152207001',
    }).save();
    const oneSecEarlierThanTx = new Date(1711264598000);
    draftRecurringDonation.createdAt = oneSecEarlierThanTx;
    draftRecurringDonation.isBatch = true;
    await draftRecurringDonation.save();

    expect(draftRecurringDonation).to.be.ok;

    await matchDraftRecurringDonations([draftRecurringDonation!]);

    const recurringDonation = await RecurringDonation.findOne({
      where: {
        txHash,
      },
    });

    const updatedDraftDonation = await DraftRecurringDonation.findOne({
      where: {
        id: draftRecurringDonation.id,
      },
    });

    expect(recurringDonation).to.be.ok;

    expect(recurringDonation?.txHash).to.be.equal(txHash);
    expect(recurringDonation?.status).to.equal(
      RECURRING_DONATION_STATUS.PENDING,
    );
    expect(recurringDonation?.origin).to.equal(
      RECURRING_DONATION_ORIGINS.DRAFT_RECURRING_DONATION_MATCHING,
    );
    expect(updatedDraftDonation?.matchedRecurringDonationId).to.equal(
      recurringDonation?.id,
    );
  });
}
