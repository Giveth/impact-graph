import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../../../test/testUtils';
import { NETWORK_IDS } from '../../../provider';
import {
  Donation,
  DONATION_STATUS,
  DONATION_TYPES,
} from '../../../entities/donation';
import {
  createDonation,
  FillPricesForDonationsWithoutPrice,
} from './donationTab';
import { User } from '../../../entities/user';
import { Project } from '../../../entities/project';

describe('createDonation() test cases', createDonationTestCases);
describe('updateDonationPrice() test cases', updateDonationPriceTestCases);

function updateDonationPriceTestCases() {
  it('Should update donation price', async () => {
    const donorAddress = generateRandomEtheriumAddress();
    const projectOwnerAddress = generateRandomEtheriumAddress();
    const donor = await saveUserDirectlyToDb(donorAddress);
    const projectOwner = await saveUserDirectlyToDb(projectOwnerAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: projectOwner.id,
      totalDonations: 0,
    });
    const donationWithoutPrice = await Donation.create({
      transactionNetworkId: 1,
      status: DONATION_STATUS.VERIFIED,
      toWalletAddress: projectOwnerAddress,
      fromWalletAddress: donorAddress,
      tokenAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      projectId: project.id,
      anonymous: false,
      amount: 1000,
      userId: donor.id,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    }).save();
    await FillPricesForDonationsWithoutPrice();
    const donationWithPrice = await Donation.findOneBy({
      id: donationWithoutPrice.id,
    });
    const donorUpdated = await User.findOneBy({ id: donor.id });
    const projectOwnerUpdated = await User.findOneBy({ id: projectOwner.id });
    const projectUpdated = await Project.findOneBy({ id: project.id });
    assert.equal(donationWithPrice?.valueUsd, donorUpdated?.totalDonated);
    assert.equal(
      donationWithPrice?.valueUsd,
      projectOwnerUpdated?.totalReceived,
    );
    assert.equal(projectUpdated?.totalDonations, donationWithPrice?.valueUsd);
    assert.isOk(donationWithPrice?.valueUsd);
  });
}

function createDonationTestCases() {
  it('Should create donations for csv airDrop', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x7a063fbb9dc674f814b8b7607e64f20e09ce4b891de72360d8be3e5ac92a4351

    const ethPrice = 2800;
    const txHash =
      '0x7a063fbb9dc674f814b8b7607e64f20e09ce4b891de72360d8be3e5ac92a4351';
    const firstProjectAddress = '0x21e0Ca21F517a26db49Ec8FCf05FCeAbBABe98FA';
    const secondProjectAddress = '0xD6c10A567A6D06eBb357f7b93195C65eC9F42Ab4';
    const thirdProjectAddress = '0x2C0d12Ecee29f36c39510Ac41d6dd1287D4Fbf8A';
    const forthProjectAddress = '0xc172542e7F4F625Bb0301f0BafC423092d9cAc71';
    const fifthProjectAddress = '0x87f1C862C166b0CEb79da7ad8d0864d53468D076';
    const sixthProjectAddress = '0xe3f738ff9fA4E157cAB12EE6f1847F680495229A';
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: firstProjectAddress,
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: secondProjectAddress,
    });
    const thirdProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: thirdProjectAddress,
    });
    const forthProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: forthProjectAddress,
    });
    const fifthProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: fifthProjectAddress,
    });
    const sixthProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: sixthProjectAddress,
    });
    await createDonation(
      {
        query: {
          recordIds: '',
        },
        payload: {
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: txHash,
          priceUsd: ethPrice,
          txType: 'csvAirDrop',
          segmentNotified: true,
        },
      },
      {
        send: () => {
          //
        },
      },
    );

    const firstDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: firstProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(firstDonation);
    assert.equal(firstDonation?.projectId, firstProject.id);

    const secondDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: secondProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(secondDonation);
    assert.equal(secondDonation?.projectId, secondProject.id);

    const thirdDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: thirdProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(thirdDonation);
    assert.equal(thirdDonation?.projectId, thirdProject.id);

    const forthDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: forthProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(forthDonation);
    assert.equal(forthDonation?.projectId, forthProject.id);

    const fifthDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: fifthProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(fifthDonation);
    assert.equal(fifthDonation?.projectId, fifthProject.id);

    const sixthDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: sixthProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(sixthDonation);
    assert.equal(sixthDonation?.projectId, sixthProject.id);

    const allTxDonations = await Donation.find({
      where: {
        transactionId: txHash,
      },
    });
    assert.equal(allTxDonations.length, 6);
    for (const donation of allTxDonations) {
      assert.equal(donation.donationType, 'csvAirDrop');
      assert.equal(donation.status, 'verified');
      assert.equal(donation.priceUsd, ethPrice);
      assert.equal(donation.segmentNotified, true);
      assert.equal(donation.amount, 0.0001);
      assert.equal(
        donation.fromWalletAddress.toLowerCase(),
        '0xB6D8D84CA33C2e8fE3be1f1B4B0B7dE57cCf4a3c'.toLowerCase(),
      );
      assert.equal(donation.currency, 'WETH');
      assert.equal(
        donation.createdAt.getTime(),
        new Date('2022-02-28T00:05:35.000Z').getTime(),
      );
    }
  });
  it('Should create donations for gnosis safe', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x43f82708d1608aa9355c0738659c658b138d54f618e3322e33a4410af48c200b

    const tokenPrice = 1;
    const txHash =
      '0x43f82708d1608aa9355c0738659c658b138d54f618e3322e33a4410af48c200b';
    const firstProjectAddress = '0x10E1439455BD2624878b243819E31CfEE9eb721C';
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: firstProjectAddress,
    });
    await createDonation(
      {
        query: {
          recordIds: '',
        },
        payload: {
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: txHash,
          priceUsd: tokenPrice,
          txType: 'gnosisSafe',
          segmentNotified: true,
          isProjectGivbackEligible: true,
        },
      },
      {
        send: () => {
          //
        },
      },
    );

    const firstDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: firstProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(firstDonation);
    assert.equal(firstDonation?.projectId, firstProject.id);

    const allTxDonations = await Donation.find({
      where: {
        transactionId: txHash,
      },
    });
    assert.equal(allTxDonations.length, 1);
    for (const donation of allTxDonations) {
      assert.equal(donation.donationType, DONATION_TYPES.GNOSIS_SAFE);
      assert.equal(donation.status, DONATION_STATUS.VERIFIED);
      assert.equal(donation.priceUsd, tokenPrice);
      assert.equal(donation.segmentNotified, true);
      assert.equal(donation.isProjectGivbackEligible, true);
      assert.equal(donation.amount, 5);
      assert.equal(
        donation.fromWalletAddress.toLowerCase(),
        '0x5f0253950c0a7715CBA25153a6ED5eBcFFEDe48e'.toLowerCase(),
      );
      assert.equal(donation.currency, 'USDC');
      assert.equal(
        donation.createdAt.getTime(),
        new Date('2022-07-04T16:55:30.000Z').getTime(),
      );
    }
  });
}
