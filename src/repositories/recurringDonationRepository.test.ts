import moment from 'moment';
import { assert } from 'chai';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { NETWORK_IDS } from '../provider';
import { addNewAnchorAddress } from './anchorContractAddressRepository';
import {
  nonZeroRecurringDonationsByProjectId,
  createNewRecurringDonation,
  findRecurringDonationById,
  findRecurringDonationByProjectIdAndUserIdAndCurrency,
  updateRecurringDonationFromTheStreamDonations,
} from './recurringDonationRepository';
import { getPendingRecurringDonationsIds } from './recurringDonationRepository';
import { DONATION_STATUS } from '../entities/donation';
import { RECURRING_DONATION_STATUS } from '../entities/recurringDonation';

describe(
  'createNewRecurringDonationTestCases',
  createNewRecurringDonationTestCases,
);

describe(
  'findRecurringDonationByProjectIdAndUserIdTestCases',
  findRecurringDonationByProjectIdAndUserIdTestCases,
);
describe(
  'countOfActiveRecurringDonationsByProjectIdTestCases',
  countOfActiveRecurringDonationsByProjectIdTestCases,
);

describe(
  'getPendingRecurringDonationsIds() test cases',
  getPendingRecurringDonationsIdsTestCases,
);
describe(
  'updateRecurringDonationFromTheStreamDonations() test cases',
  updateRecurringDonationFromTheStreamDonationsTestCases,
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
      isBatch: false,
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
      isBatch: false,
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
      isBatch: false,
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
      isBatch: false,
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
      isBatch: false,
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

function countOfActiveRecurringDonationsByProjectIdTestCases() {
  it('should return count correctly', async () => {
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
      totalUsdStreamed: 1,
      currency,
      project,
      anonymous: false,
      isBatch: false,
    });
    recurringDonation.status = RECURRING_DONATION_STATUS.ACTIVE;
    await recurringDonation.save();
    const count = await nonZeroRecurringDonationsByProjectId(project.id);
    assert.equal(count, 1);
  });
  it('should return count correctly, when there is more than 1 active recurring donation', async () => {
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
      isBatch: false,
      totalUsdStreamed: 1,
    });
    recurringDonation.status = RECURRING_DONATION_STATUS.ACTIVE;
    await recurringDonation.save();

    const recurringDonation2 = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
      isBatch: false,
      totalUsdStreamed: 1,
    });
    recurringDonation2.status = RECURRING_DONATION_STATUS.ACTIVE;
    await recurringDonation2.save();

    const count = await nonZeroRecurringDonationsByProjectId(project.id);
    assert.equal(count, 2);
  });
  it('should return count correctly, when there is active and non active donations', async () => {
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

    const recurringDonation0 = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
      isBatch: false,
      totalUsdStreamed: 0,
    });
    recurringDonation0.status = RECURRING_DONATION_STATUS.ACTIVE;
    await recurringDonation0.save();

    const recurringDonation1 = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
      isBatch: false,
      totalUsdStreamed: 1,
    });
    recurringDonation1.status = RECURRING_DONATION_STATUS.ACTIVE;
    await recurringDonation1.save();

    const recurringDonation2 = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
      isBatch: false,
    });
    recurringDonation2.status = RECURRING_DONATION_STATUS.PENDING;
    await recurringDonation2.save();

    const recurringDonation3 = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
      isBatch: false,
      totalUsdStreamed: 2,
    });
    recurringDonation3.status = RECURRING_DONATION_STATUS.ENDED;
    await recurringDonation3.save();

    const recurringDonation4 = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: creator,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
      isBatch: false,
    });
    recurringDonation4.status = RECURRING_DONATION_STATUS.FAILED;
    await recurringDonation4.save();

    const count = await nonZeroRecurringDonationsByProjectId(project.id);
    assert.equal(count, 2);
  });
}

function updateRecurringDonationFromTheStreamDonationsTestCases() {
  it('should fill amountStreamed, totalUsdStreamed correctly', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const anchorAddress = generateRandomEtheriumAddress();

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: donor,
      address: anchorAddress,
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const currency = 'USDT';
    const recurringDonation = await createNewRecurringDonation({
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      donor: donor,
      anchorContractAddress,
      flowRate: '100',
      currency,
      project,
      anonymous: false,
      isBatch: false,
    });
    const d1 = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.VERIFIED,
        amount: 13,
        valueUsd: 15,
      },
      donor.id,
      project.id,
    );
    d1.recurringDonation = recurringDonation;
    await d1.save();

    const d2 = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.VERIFIED,
        amount: 12,
        valueUsd: 14,
      },
      donor.id,
      project.id,
    );
    d2.recurringDonation = recurringDonation;
    await d2.save();

    await updateRecurringDonationFromTheStreamDonations(recurringDonation.id);
    const updatedRecurringDonation = await findRecurringDonationById(
      recurringDonation.id,
    );

    assert.equal(
      updatedRecurringDonation?.totalUsdStreamed,
      d1.valueUsd + d2.valueUsd,
    );
    assert.equal(
      updatedRecurringDonation?.amountStreamed,
      d1.amount + d2.amount,
    );
  });
}
