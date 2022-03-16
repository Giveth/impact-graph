import { assert } from 'chai';
import 'mocha';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import { Donation } from '../entities/donation';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../services/userService';
import { ORGANIZATION_LABELS } from '../entities/organization';

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
    const user = await User.findOne({ id: SEED_DATA.FIRST_USER.id });
    user!.totalDonated = 0;
    user!.save();

    await updateUserTotalDonated(SEED_DATA.FIRST_USER.id);

    const updatedUser = await User.findOne({ id: SEED_DATA.FIRST_USER.id });
    const totalDonated = await Donation.createQueryBuilder('donation')
      .select('SUM(donation.valueUsd)', 'sum')
      .where(`donation.userId = ${SEED_DATA.FIRST_USER.id}`)
      .getRawOne();

    assert.notEqual(user!.totalDonated, updatedUser!.totalDonated);
    assert.equal(updatedUser!.totalDonated, totalDonated.sum);
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
    const owner = await User.findOne({ id: user.id });
    owner!.totalReceived = 0;
    await owner!.save();

    await updateUserTotalReceived(user.id);

    const updatedOwner = await User.findOne({ id: user.id });
    assert.notEqual(owner!.totalReceived, updatedOwner!.totalReceived);
    assert.equal(updatedOwner!.totalReceived, 180);
  });
}
