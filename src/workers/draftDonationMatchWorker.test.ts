import {
  DraftDonation,
  DRAFT_DONATION_STATUS,
} from '../entities/draftDonation.js';
import { Project, ProjectUpdate } from '../entities/project.js';
import { NETWORK_IDS } from '../provider.js';
import {
  saveUserDirectlyToDb,
  saveProjectDirectlyToDb,
  createProjectData,
} from '../../test/testUtils.js';
import { Donation } from '../entities/donation.js';
import { ProjectAddress } from '../entities/projectAddress.js';
import { findUserByWalletAddress } from '../repositories/userRepository.js';
import { User } from '../entities/user.js';

const RandomAddress1 = '0xf3ddeb5022a6f06b61488b48c90315087ca2beef';
const RandomAddress2 = '0xc42a4791735ae1253c50c6226832e37ede3669f5';
const draftSaveTimeStampMS = 1707567300 * 1000;
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

describe('draftDonationMatchWorker', () => {
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
  it('should match draft donations', async () => {
    await DraftDonation.create(erc20DonationData).save();
    await DraftDonation.create(nativeTokenDonationData).save();
    // await runDraftDonationMatchWorker();
  });
});
