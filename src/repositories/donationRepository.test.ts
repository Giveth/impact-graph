import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import { User, UserRole } from '../entities/user';
import { assert } from 'chai';
import {
  createDonation,
  findDonationByUserId,
  findDonationsFromWalletAddresses,
} from './donationRepository';

describe('findDonationsFromWalletAddresses test cases', () => {
  it('should find donation fromWallet address', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donationData = createDonationData();
    const walletAddress = generateRandomEtheriumAddress();
    donationData.fromWalletAddress = walletAddress;

    await saveDonationDirectlyToDb(donationData, user.id, project.id);

    const findDonation = await findDonationsFromWalletAddresses([
      walletAddress,
    ]);
    assert.isOk(findDonation);
    findDonation.forEach(item => {
      assert.equal(item.fromWalletAddress, walletAddress);
    });
  });
  it('should find donation uppercase fromWallet address', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donationData = createDonationData();
    const walletAddress = generateRandomEtheriumAddress();
    donationData.fromWalletAddress = walletAddress;

    await saveDonationDirectlyToDb(donationData, user.id, project.id);

    const findDonation = await findDonationsFromWalletAddresses([
      walletAddress.toUpperCase(),
    ]);
    assert.isOk(findDonation);
    findDonation.forEach(item => {
      assert.equal(item.fromWalletAddress, walletAddress);
    });
  });
});

describe('findDonationByUserId test cases', () => {
  it('should find donation by userId', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donationData = createDonationData();
    const walletAddress = generateRandomEtheriumAddress();
    donationData.fromWalletAddress = walletAddress;

    await saveDonationDirectlyToDb(donationData, user.id, project.id);

    const findDonation = await findDonationByUserId(user.id);
    assert.isOk(findDonation);
    findDonation.forEach(item => {
      assert.equal(item.userId, user.id);
    });
  });
});

// describe('createDonation test cases', () => {
//   it('should create donation ', async () => {
//     const email = `${new Date().getTime()}@giveth.io`;
//     const user = await User.create({
//       email,
//       role: UserRole.ADMIN,
//       walletAddress: generateRandomEtheriumAddress(),
//       loginType: 'wallet',
//     }).save();
//     const project = await saveProjectDirectlyToDb(createProjectData());
//     const donationData = createDonationData();
//     const walletAddress = generateRandomEtheriumAddress();
//     donationData.toWalletAddress = walletAddress;
//     donationData.projectId = project.id;
//     const newDonation = await createDonation(donationData);
//     assert.isOk(newDonation);
//     assert.equal(newDonation.projectId, project.id);
//   });
// });
