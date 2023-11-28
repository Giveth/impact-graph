import { assert, use } from 'chai';
import 'mocha';
import { User, UserRole } from '../entities/user';
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
  fetchAdminAndValidatePassword,
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../services/userService';
import { ORGANIZATION_LABELS } from '../entities/organization';
import { generateRandomString } from '../utils/utils';
// tslint:disable-next-line:no-var-requires
const bcrypt = require('bcrypt');
import { findUserById } from '../repositories/userRepository';
import { QfRound } from '../entities/qfRound';
import moment from 'moment';
import { QfRoundHistory } from '../entities/qfRoundHistory';
import { updateTotalDonationsOfProject } from './donationService';

describe(
  'updateUserTotalDonated() test cases',
  updateUserTotalDonatedTestCases,
);
describe(
  'updateUserTotalReceived() test cases',
  updateUserTotalReceivedTestCases,
);

describe(
  'fetchAdminAndValidatePassword() test cases',
  fetchAdminAndValidatePasswordTestCases,
);

function updateUserTotalDonatedTestCases() {
  it('should update total donated of a donor', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(createProjectData());
    const valueUsd = 100;
    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.VERIFIED,
        valueUsd,
      },
      user.id,
      project.id,
    );

    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const donation2 = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.FAILED,
        valueUsd: 500,
      },
      user.id,
      project.id,
    );

    await updateUserTotalDonated(user.id);

    const updatedUser = await findUserById(user.id);
    const notUpdatedUser = await User.findOne({ where: { id: user2.id } });
    // second failed donation is ignored
    assert.equal(updatedUser?.totalDonated, valueUsd);
    // Non related user is not updated
    assert.equal(notUpdatedUser?.totalDonated, 0);
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
    const owner = (await findUserById(user.id)) as User;
    owner.totalReceived = 0;
    await owner?.save();

    await updateUserTotalReceived(user.id);

    const updatedOwner = await findUserById(user.id);
    assert.notEqual(owner!.totalReceived, updatedOwner!.totalReceived);
    assert.equal(updatedOwner!.totalReceived, 180);
  });

  it('should update total received of a owner including matchingFunds', async () => {
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
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
      totalDonations: 190,
    });
    const qfRound = QfRound.create({
      isActive: false,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    project.qfRounds = [qfRound];
    project2.qfRounds = [qfRound];
    await project.save();
    await project2.save();
    await QfRoundHistory.create({
      qfRoundId: qfRound.id,
      projectId: project.id,
      matchingFund: 150,
    }).save();
    await QfRoundHistory.create({
      qfRoundId: qfRound.id,
      projectId: project2.id,
      matchingFund: 160,
    }).save();
    const owner = (await findUserById(user.id)) as User;
    owner.totalReceived = 0;
    await owner?.save();

    await updateTotalDonationsOfProject(project.id);
    await updateUserTotalReceived(user.id);

    const updatedOwner = await findUserById(user.id);
    assert.notEqual(owner!.totalReceived, updatedOwner!.totalReceived);
    assert.equal(updatedOwner!.totalReceived, 180 + 190 + 150 + 160);
  });
}

function fetchAdminAndValidatePasswordTestCases() {
  it('should return the user when email and password are correct', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const password = generateRandomString(10);
    user.role = UserRole.ADMIN;
    user.encryptedPassword = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_SALT),
    );
    await user.save();
    const validatedUser = await fetchAdminAndValidatePassword({
      email: user.email as string,
      password,
    });
    assert.equal(validatedUser?.id, user.id);
  });
  it('should return false if the password is incorrect', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const password = generateRandomString(10);
    user.role = UserRole.ADMIN;
    user.encryptedPassword = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_SALT),
    );
    await user.save();
    const validatedUser = await fetchAdminAndValidatePassword({
      email: user.email as string,
      password: 'wrongPassword',
    });
    assert.isUndefined(validatedUser);
  });
}
