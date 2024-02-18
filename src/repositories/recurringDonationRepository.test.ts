import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { NETWORK_IDS } from '../provider';
import { assert } from 'chai';
import { addNewAnchorAddress } from './anchorContractAddressRepository';
import { createNewRecurringDonation } from './recurringDonationRepository';

describe(
  'createNewRecurringDonationTestCases',
  createNewRecurringDonationTestCases,
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
      amount: 100,
      currency: 'USD',
      interval: 'monthly',
      project,
    });

    assert.isNotNull(recurringDonation);
    assert.equal(
      recurringDonation.anchorContractAddress.id,
      anchorContractAddress.id,
    );
    assert.equal(recurringDonation.donor.id, creator.id);
  });
}
