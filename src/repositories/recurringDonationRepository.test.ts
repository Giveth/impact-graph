import moment from 'moment';
import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { NETWORK_IDS } from '../provider';
import { addNewAnchorAddress } from './anchorContractAddressRepository';
import {
  createNewRecurringDonation,
  findRecurringDonationByProjectIdAndUserIdAndCurrency,
} from './recurringDonationRepository';
import { getPendingRecurringDonationsIds } from './recurringDonationRepository';

describe(
  'createNewRecurringDonationTestCases',
  createNewRecurringDonationTestCases,
);

describe(
  'findRecurringDonationByProjectIdAndUserIdTestCases',
  findRecurringDonationByProjectIdAndUserIdTestCases,
);

describe(
  'getPendingRecurringDonationsIds() test cases',
  getPendingRecurringDonationsIdsTestCases,
);

function getPendingRecurringDonationsIdsTestCases() {
  it('should return pending donations in last 48 hours', async () => {
    const pendingRecurringDonations = await getPendingRecurringDonationsIds();

    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const creator = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const anchorAddress = generateRandomEtheriumAddress();

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator,
      address: anchorAddress,
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const currency = 'USD';
    const recurringDonation = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
    });
    // recurringDonation.status = RECURRING_DONATION_STATUS.PENDING
    // await recurringDonation.save()

    const oldDonation = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
    });
    oldDonation.createdAt = moment()
      .subtract({
        hours:
          Number(process.env.RECURRING_DONATION_VERIFICAITON_EXPIRATION_HOURS) +
          2,
      })
      .toDate();
    await oldDonation.save();

    const oldDonation2 = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
    });
    oldDonation2.createdAt = moment()
      .subtract({
        hours:
          Number(process.env.RECURRING_DONATION_VERIFICAITON_EXPIRATION_HOURS) +
          2,
      })
      .toDate();
    await oldDonation2.save();

    const newPendingDonations = await getPendingRecurringDonationsIds();

    assert.equal(
      newPendingDonations.length,
      pendingRecurringDonations.length + 1,
    );
    assert.isOk(
      newPendingDonations.find(
        donation => donation.id === recurringDonation.id,
      ),
    );
    assert.notOk(
      newPendingDonations.find(donation => donation.id === oldDonation.id),
    );
    assert.notOk(
      newPendingDonations.find(donation => donation.id === oldDonation2.id),
    );
  });
}

function createNewRecurringDonationTestCases() {
  it('should create recurring donation successfully', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const creator = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const anchorAddress = generateRandomEtheriumAddress();

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator,
      address: anchorAddress,
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const recurringDonation = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency: 'USD',
      project,
      anonymous: false,
    });

    assert.isNotNull(recurringDonation);
    assert.equal(
      recurringDonation.anchorContractAddress.id,
      anchorContractAddress.id,
    );
    assert.equal(recurringDonation.donor.id, creator.id);
  });
}

function findRecurringDonationByProjectIdAndUserIdTestCases() {
  it('should find recurring donation successfully', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const creator = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const anchorAddress = generateRandomEtheriumAddress();

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator,
      address: anchorAddress,
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const currency = 'USD';
    const recurringDonation = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
    });
    const foundRecurringDonation =
      await findRecurringDonationByProjectIdAndUserIdAndCurrency({
        projectId: project.id,
        userId: creator.id,
        currency,
      });
    assert.equal(foundRecurringDonation?.id, recurringDonation.id);
  });
}
