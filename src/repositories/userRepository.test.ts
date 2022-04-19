import { generateRandomEtheriumAddress } from '../../test/testUtils';
import { User, UserRole } from '../entities/user';
import {
  findAdminUserByEmail,
  findUserById,
  findUserByWalletAddress,
} from './userRepository';
import { assert } from 'chai';

describe('sql injection test cases', () => {
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
});

describe('findAdminUserByEmail test cases', () => {
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
    assert.isUndefined(foundUser);
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
});

describe('findUserByWalletAddress test cases', () => {
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

  it('Should find user by uppercase walletAddress', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    }).save();
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
});

describe('findUserById test cases', () => {
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
    assert.isUndefined(foundUser);
  });
});
