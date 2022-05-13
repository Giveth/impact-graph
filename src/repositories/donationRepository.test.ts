import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomTxHash,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { User, UserRole } from '../entities/user';
import { assert } from 'chai';
import {
  createDonation,
  findDonationById,
  findDonationsByTransactionId,
} from './donationRepository';

describe('createDonation test cases', () => {
  it('should create donation ', async () => {
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
    donationData.toWalletAddress = walletAddress;
    donationData.projectId = project.id;
    const newDonation = await createDonation({
      donationAnonymous: false,
      donorUser: user,
      isProjectVerified: false,
      isTokenEligibleForGivback: false,
      project,
      segmentNotified: false,
      tokenAddress: '',
      transakId: '',
      transactionId: '9151faa1-e69b-4a36-b959-3c4f894afb68',
      transactionNetworkId: 10,
      toWalletAddress: '134',
      fromWalletAddress: '134',
      amount: 10,
      token: 'jgjbjbkjbnjknb',
    });
    assert.isOk(newDonation);
    assert.equal(newDonation.projectId, project.id);
  });
});

describe(
  'findDonationsByTransactionId() test cases',
  findDonationsByTransactionIdTestCases,
);
describe('findDonationById() test cases', findDonationByIdTestCases);

function findDonationsByTransactionIdTestCases() {
  it('should return donation with txHash ', async () => {
    const donation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    const fetchedDonation = await findDonationsByTransactionId(
      donation.transactionId,
    );
    assert.isOk(fetchedDonation);
    assert.equal(fetchedDonation?.id, donation.id);
  });
  it('should return donation with lowercase txHash ', async () => {
    const donation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    const fetchedDonation = await findDonationsByTransactionId(
      donation.transactionId.toLowerCase(),
    );
    assert.isOk(fetchedDonation);
    assert.equal(fetchedDonation?.id, donation.id);
  });
  it('should return donation with uppercase txHash ', async () => {
    const donation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    const fetchedDonation = await findDonationsByTransactionId(
      donation.transactionId.toUpperCase(),
    );
    assert.isOk(fetchedDonation);
    assert.equal(fetchedDonation?.id, donation.id);
  });
  it('should not return donation with invalid txHash ', async () => {
    const fetchedDonation = await findDonationsByTransactionId(
      generateRandomTxHash(),
    );
    assert.isNotOk(fetchedDonation);
  });
}

function findDonationByIdTestCases() {
  it('should return donation with id ', async () => {
    const donation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    const fetchedDonation = await findDonationById(donation.id);
    assert.isOk(fetchedDonation);
    assert.equal(fetchedDonation?.id, donation.id);
  });
  it('should not return donation with invalid id ', async () => {
    const fetchedDonation = await findDonationById(10000000);
    assert.isNotOk(fetchedDonation);
  });
}
