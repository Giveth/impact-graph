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
  findStableCoinDonationsWithoutPrice,
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
describe(
  'findStableCoinDonationsWithoutPrice() test cases',
  findStableCoinDonationsWithoutPriceTestCases,
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
    assert.isOk(fetchedDonation?.project);
    assert.equal(fetchedDonation?.project.id, SEED_DATA.FIRST_PROJECT.id);
  });
  it('should not return donation with invalid id ', async () => {
    const fetchedDonation = await findDonationById(10000000);
    assert.isNotOk(fetchedDonation);
  });
}

function findStableCoinDonationsWithoutPriceTestCases() {
  it('should just return stable coin donations without price', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const donationData1 = createDonationData();
    delete donationData1.valueUsd;
    donationData1.currency = 'USDC';

    const donationData2 = createDonationData();
    donationData2.currency = 'USDC';

    const donationData3 = createDonationData();
    delete donationData3.valueUsd;
    donationData3.currency = 'USDT';

    const donationData4 = createDonationData();
    donationData4.currency = 'USDT';

    const donationData5 = createDonationData();
    delete donationData5.valueUsd;
    donationData5.currency = 'WXDAI';

    const donationData6 = createDonationData();
    donationData6.currency = 'WXDAI';

    const donationData7 = createDonationData();
    delete donationData7.valueUsd;
    donationData7.currency = 'XDAI';

    const donationData8 = createDonationData();
    donationData8.currency = 'XDAI';

    const donationData9 = createDonationData();
    delete donationData9.valueUsd;

    await saveDonationDirectlyToDb(donationData1, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData2, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData3, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData4, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData5, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData6, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData7, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData8, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData9, donor.id, project.id);

    const donations = await findStableCoinDonationsWithoutPrice();
    assert.equal(donations.length, 4);
    assert.isOk(
      donations.find(
        donation => donation.transactionId === donationData1.transactionId,
      ),
    );
    assert.isOk(
      donations.find(
        donation => donation.transactionId === donationData3.transactionId,
      ),
    );
    assert.isOk(
      donations.find(
        donation => donation.transactionId === donationData5.transactionId,
      ),
    );
    assert.isOk(
      donations.find(
        donation => donation.transactionId === donationData7.transactionId,
      ),
    );

    await updateOldStableCoinDonationsPrice();

    // Shoud fill valuUsd of all stable coin donations
    const stableDonationsWithoutPrice =
      await findStableCoinDonationsWithoutPrice();
    assert.isEmpty(stableDonationsWithoutPrice);
  });
}
