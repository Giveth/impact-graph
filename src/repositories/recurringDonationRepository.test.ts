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

describe(
  'createNewRecurringDonationTestCases',
  createNewRecurringDonationTestCases,
);

describe(
  'findRecurringDonationByProjectIdAndUserIdTestCases',
  findRecurringDonationByProjectIdAndUserIdTestCases,
);

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
