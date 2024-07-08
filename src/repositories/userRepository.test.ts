import { assert } from 'chai';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { User, UserRole } from '../entities/user';
import {
  findAdminUserByEmail,
  findAllUsers,
  findUserById,
  findUserByWalletAddress,
  findUsersWhoBoostedProject,
  findUsersWhoDonatedToProjectExcludeWhoLiked,
  findUsersWhoLikedProjectExcludeProjectOwner,
  findUsersWhoSupportProject,
} from './userRepository';
import { Reaction } from '../entities/reaction';
import { insertSinglePowerBoosting } from './powerBoostingRepository';

describe('sql injection test cases', sqlInjectionTestCases);

describe(' findAdminUserByEmail cases', findAdminUserByEmailTestCases);

describe(
  'findUserByWalletAddress test cases',
  findUserByWalletAddressTestCases,
);

describe('findUserById test cases', findUserByIdTestCases);
describe('findAllUsers test cases', findAllUsersTestCases);
describe(
  'findUsersWhoSupportProject test cases',
  findUsersWhoSupportProjectTestCases,
);
describe(
  'findUsersWhoLikedProjectExcludeProjectOwner() test cases',
  findUsersWhoLikedProjectTestCases,
);

describe(
  'findUsersWhoBoostedProject() testCases',
  findUsersWhoBoostedProjectTests,
);

describe(
  'findUsersWhoDonatedToProjectExcludeWhoLiked() test cases',
  findUsersWhoDonatedToProjectTestCases,
);

function findUsersWhoDonatedToProjectTestCases() {
  it('should find wallet addresses of who donated to a project, exclude who liked', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const whoLiked = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    await Reaction.create({
      project,
      userId: whoLiked.id,
      reaction: 'heart',
    }).save();
    await saveDonationDirectlyToDb(createDonationData(), donor1.id, project.id);
    await saveDonationDirectlyToDb(createDonationData(), donor2.id, project.id);
    await saveDonationDirectlyToDb(
      createDonationData(),
      whoLiked.id,
      project.id,
    );

    const users = await findUsersWhoDonatedToProjectExcludeWhoLiked(project.id);
    assert.equal(users.length, 2);
    assert.isOk(
      users.find(user => user.walletAddress === donor1.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === donor2.walletAddress),
    );
    assert.notOk(
      users.find(user => user.walletAddress === whoLiked.walletAddress),
    );
  });
  it('should find wallet addresses of who donated to a project, not include repetitive items', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donor3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveDonationDirectlyToDb(createDonationData(), donor1.id, project.id);
    await saveDonationDirectlyToDb(createDonationData(), donor1.id, project.id);
    await saveDonationDirectlyToDb(createDonationData(), donor1.id, project.id);
    await saveDonationDirectlyToDb(createDonationData(), donor2.id, project.id);
    await saveDonationDirectlyToDb(createDonationData(), donor2.id, project.id);
    await saveDonationDirectlyToDb(createDonationData(), donor3.id, project.id);
    await saveDonationDirectlyToDb(createDonationData(), donor3.id, project.id);
    const users = await findUsersWhoDonatedToProjectExcludeWhoLiked(project.id);
    assert.equal(users.length, 3);
    assert.isOk(
      users.find(user => user.walletAddress === donor1.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === donor2.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === donor3.walletAddress),
    );
  });
}

function findUsersWhoBoostedProjectTests() {
  it('should find wallet addresses of who boosted a project', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const thirdUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const fourthUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project,
      percentage: 1,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: thirdUser,
      project,
      percentage: 3,
    });
    await insertSinglePowerBoosting({
      user: fourthUser,
      project,
      percentage: 0,
    });

    const users = await findUsersWhoBoostedProject(project.id);
    assert.equal(users.length, 3);
    assert.isOk(
      users.find(user => user.walletAddress === firstUser.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === secondUser.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === thirdUser.walletAddress),
    );
    assert.isNotOk(
      users.find(user => user.walletAddress === fourthUser.walletAddress),
    );
  });
}

function findUsersWhoLikedProjectTestCases() {
  it('should find wallet addresses of who liked to a project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const firstUser1 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstUser2 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstUser3 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    await Reaction.create({
      project,
      userId: firstUser1.id,
      reaction: 'heart',
    }).save();
    await Reaction.create({
      project,
      userId: firstUser2.id,
      reaction: 'heart',
    }).save();
    await Reaction.create({
      project,
      userId: firstUser3.id,
      reaction: 'heart',
    }).save();

    const users = await findUsersWhoLikedProjectExcludeProjectOwner(project.id);
    assert.equal(users.length, 3);
    assert.isOk(
      users.find(user => user.walletAddress === firstUser1.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === firstUser2.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === firstUser3.walletAddress),
    );
  });
  it('should find wallet addresses of who liked to a project, exclude project owner', async () => {
    const admin = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(createProjectData(), admin);
    const firstUser1 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstUser2 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    await Reaction.create({
      project,
      userId: firstUser1.id,
      reaction: 'heart',
    }).save();
    await Reaction.create({
      project,
      userId: firstUser2.id,
      reaction: 'heart',
    }).save();
    await Reaction.create({
      project,
      userId: admin.id,
      reaction: 'heart',
    }).save();

    const users = await findUsersWhoLikedProjectExcludeProjectOwner(project.id);
    assert.equal(users.length, 2);
    assert.isOk(
      users.find(user => user.walletAddress === firstUser1.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === firstUser2.walletAddress),
    );
    assert.isNotOk(
      users.find(user => user.walletAddress === admin.walletAddress),
    );
  });
}

function findAdminUserByEmailTestCases() {
  it('should Find admin user by email', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, user.id);
  });

  it('should Find operator user by email', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      role: UserRole.OPERATOR,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, user.id);
  });

  it('should not find operator/admin user when doesnt exists', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const foundUser = await findAdminUserByEmail(email);
    assert.isNull(foundUser);
  });

  it('should find admin user when there is two user with similar email and restricted one created first', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    await User.create({
      email,
      role: UserRole.RESTRICTED,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const adminUser = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, adminUser.id);
  });
  it('should find admin user when there is two user with similar email and admin one created first', async () => {
    const email = `${new Date().getTime()}@giveth.io`;

    const adminUser = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    await User.create({
      email,
      role: UserRole.RESTRICTED,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, adminUser.id);
  });

  it('should find operator user when there is two user with similar email and restricted one created first', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    await User.create({
      email,
      role: UserRole.RESTRICTED,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const adminUser = await User.create({
      email,
      role: UserRole.OPERATOR,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, adminUser.id);
  });

  it('should find operator user when there is two user with similar email and operator one created first', async () => {
    const email = `${new Date().getTime()}@giveth.io`;

    const adminUser = await User.create({
      email,
      role: UserRole.OPERATOR,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    await User.create({
      email,
      role: UserRole.RESTRICTED,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, adminUser.id);
  });
}

function findUserByWalletAddressTestCases() {
  it('Should find user by walletAddress', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    }).save();
    const foundUser = await findUserByWalletAddress(
      user.walletAddress as string,
    );
    assert.isOk(foundUser);
    assert.equal(foundUser?.walletAddress, user.walletAddress);
  });

  it('Should find user by walletAddress without sensitive fields', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const foundUser = await findUserByWalletAddress(
      user.walletAddress as string,
      false,
    );
    assert.isOk(foundUser);
    assert.equal(foundUser?.walletAddress, user.walletAddress);
    assert.isNotOk(foundUser?.email);
  });

  it('Should find user by walletAddress with all fields', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const foundUser = await findUserByWalletAddress(
      user.walletAddress as string,
    );
    assert.isOk(foundUser);
    assert.equal(foundUser?.walletAddress, user.walletAddress);
    assert.isOk(foundUser?.email);
  });

  it('Should find user by uppercase walletAddress', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const foundUser = await findUserByWalletAddress(
      (user?.walletAddress as string).toUpperCase(),
    );
    assert.isOk(foundUser);
    assert.equal(foundUser?.walletAddress, user.walletAddress);
  });

  it('should not find  user when walletAddress doesnt exists', async () => {
    const foundUser = await findUserByWalletAddress(
      generateRandomEtheriumAddress(),
    );
    assert.isNotOk(foundUser);
  });
}

function findUserByIdTestCases() {
  it('Should find user by id', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    }).save();
    const foundUser = await findUserById(user?.id as number);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, user.id);
  });

  it('should not find  user when userId doesnt exists', async () => {
    const foundUser = await findUserById(1000000000);
    assert.isNull(foundUser);
  });

  it('should not find  user when userId is undefined', async () => {
    // @ts-expect-error it's a test
    const foundUser = await findUserById(undefined);
    assert.isNull(foundUser);
  });
}

function findAllUsersTestCases() {
  it('should return all users, count should work fine', async () => {
    const { count, users } = await findAllUsers({ take: 7, skip: 0 });
    assert.equal(users.length, 7);
    const newUser = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const allUsers = await findAllUsers({ take: 1, skip: count });
    assert.equal(allUsers.count, count + 1);
    assert.equal(allUsers.users[0].id, newUser.id);
  });
}

function sqlInjectionTestCases() {
  it('should not find user when sending SQL query instead of email (test to be safe on SQL injection)', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    await User.create({
      email,
      role: UserRole.OPERATOR,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const foundUser = await findAdminUserByEmail(
      `${email}' OR email = 'anotherEmail'`,
    );
    assert.isNotOk(foundUser);
  });

  it('should not find user when sending SQL query instead of walletAddress (test to be safe on SQL injection)', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const walletAddress = generateRandomEtheriumAddress();
    await User.create({
      email,
      role: UserRole.OPERATOR,
      walletAddress,
      loginType: 'wallet',
    }).save();
    const foundUser = await findUserByWalletAddress(
      `${walletAddress}' OR "walletAddress" = '${generateRandomEtheriumAddress()}'`,
    );
    assert.isNotOk(foundUser);
  });
}

function findUsersWhoSupportProjectTestCases() {
  it('should find wallet addresses of who donated to a project + who liked + who boosted and not having repetitive items - projectOwner', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: projectOwner.id,
    });

    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const whoLiked = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const thirdUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const fourthUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    // Add donors
    await saveDonationDirectlyToDb(createDonationData(), donor1.id, project.id);
    await saveDonationDirectlyToDb(createDonationData(), donor2.id, project.id);
    await saveDonationDirectlyToDb(
      createDonationData(),
      whoLiked.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData(),
      firstUser.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData(),
      projectOwner.id,
      project.id,
    );

    // Add reaction
    await Reaction.create({
      project,
      userId: whoLiked.id,
      reaction: 'heart',
    }).save();
    await Reaction.create({
      project,
      userId: projectOwner.id,
      reaction: 'heart',
    }).save();

    // Add power boostings
    await insertSinglePowerBoosting({
      user: firstUser,
      project,
      percentage: 1,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: thirdUser,
      project,
      percentage: 3,
    });
    await insertSinglePowerBoosting({
      user: fourthUser,
      project,
      percentage: 5,
    });

    const users = await findUsersWhoSupportProject(project.id);
    assert.equal(users.length, 7);
    assert.isOk(
      users.find(user => user.walletAddress === donor1.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === donor2.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === whoLiked.walletAddress),
    );

    assert.isOk(
      users.find(user => user.walletAddress === firstUser.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === secondUser.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === thirdUser.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === fourthUser.walletAddress),
    );
  });
}
