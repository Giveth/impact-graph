import { assert } from 'chai';
import 'mocha';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import { Donation, DONATION_STATUS } from '../entities/donation';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../services/userService';
import { ORGANIZATION_LABELS } from '../entities/organization';
import { create } from 'domain';

describe(
  'updateUserTotalDonated() test cases',
  updateUserTotalDonatedTestCases,
);
describe(
  'updateUserTotalReceived() test cases',
  updateUserTotalReceivedTestCases,
);

function updateUserTotalDonatedTestCases() {
  it('should update total donated of a donor', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(createProjectData());
    const valueUsd = 100;
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.VERIFIED,
        valueUsd,
      },
      user.id,
      project.id,
    );

    await updateUserTotalDonated(user.id);

    const updatedUser = await User.findOne({ id: user.id });
    assert.equal(updatedUser?.totalDonated, valueUsd);
  });
}

function updateUserTotalReceivedTestCases() {
  it('should update total received of a owner', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'test name',
    }).save();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
      totalDonations: 180,
    });
    const owner = (await User.findOne({ id: user.id })) as User;
    owner.totalReceived = 0;
    await owner?.save();

    await updateUserTotalReceived(user.id);

    const updatedOwner = await User.findOne({ id: user.id });
    assert.notEqual(owner!.totalReceived, updatedOwner!.totalReceived);
    assert.equal(updatedOwner!.totalReceived, 180);
  });
}
