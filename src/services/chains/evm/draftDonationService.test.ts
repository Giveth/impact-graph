import axios from 'axios';
import { expect } from 'chai';
import { createDraftDonationMutation } from '../../../../test/graphqlQueries';
import {
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  createProjectData,
  generateTestAccessToken,
  generateRandomEvmTxHash,
  graphqlUrl,
  saveUserDirectlyToDb,
} from '../../../../test/testUtils';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../../../entities/draftDonation';
import { NETWORK_IDS } from '../../../provider';
import { generateRandomString } from '../../../utils/utils';
import { User } from '../../../entities/user';
import { ProjectAddress } from '../../../entities/projectAddress';
import { matchDraftDonations } from './draftDonationService';

describe('draftDonationMatching', draftDonationMatchingTests);

const RandomAddress1 = '0xf3ddeb5022a6f06b61488b48c90315087ca2beef';
const RandomAddress2 = '0xc42a4791735ae1253c50c6226832e37ede3669f5';
const draftSaveTimeStampMS = 1707567450 * 1000;

function draftDonationMatchingTests() {
  beforeEach(async () => {
    await User.delete({ walletAddress: RandomAddress1 });
    await ProjectAddress.delete({ address: RandomAddress2 });
  });

  it('should match a donation to a draft', async () => {
    // Setup
    const user = await saveUserDirectlyToDb(RandomAddress1);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: RandomAddress2,
    });
    const tokenAddress = '0x4f4f9b8d5b4d0dc10506e5551b0513b61fd59e75';

    const draftDonation = await DraftDonation.create({
      networkId: NETWORK_IDS.XDAI,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: project.walletAddress!,
      fromWalletAddress: user.walletAddress!,
      tokenAddress,
      currency: 'GIV',
      anonymous: false,
      amount: 0.01,
      projectId: project.id,
      userId: user.id,
      createdAt: new Date(draftSaveTimeStampMS),
    });
    await draftDonation.save();

    expect(draftDonation).to.be.ok;

    await matchDraftDonations({ [RandomAddress1]: [draftDonation!] });

    //   const userDraftDonationsMap = {
    //     [user.walletAddress]: [draftDonation],
    //   };

    //   // Action
    //   await matchDraftDonations(userDraftDonationsMap);

    //   // Test
    //   const donation = await Donation.findOne({
    //     where: {
    //       draftDonationId: draftDonation.id,
    //     },
    //   });
  });
}
