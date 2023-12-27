import { NETWORK_IDS } from '../provider';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomTxHash,
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { assert } from 'chai';
import axios from 'axios';
import {
  createAnchorContractAddressQuery,
  createRecurringDonationQuery,
} from '../../test/graphqlQueries';
import { errorMessages } from '../utils/errorMessages';
import { addNewAnchorAddress } from '../repositories/anchorContractAddressRepository';

describe(
  'createRecurringDonation test cases',
  createRecurringDonationTestCases,
);

function createRecurringDonationTestCases() {
  it('should create recurringDonation successfully', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomTxHash(),
    });

    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createRecurringDonationQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomTxHash(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isNotNull(result.data.data.createRecurringDonation);
    assert.equal(
      result.data.data.createRecurringDonation.networkId,
      NETWORK_IDS.OPTIMISTIC,
    );
  });

  it('should return unAuthorized error when not sending JWT', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomTxHash(),
    });

    const result = await axios.post(graphqlUrl, {
      query: createRecurringDonationQuery,
      variables: {
        projectId: project.id,
        networkId: NETWORK_IDS.OPTIMISTIC,
        txHash: generateRandomTxHash(),
      },
    });

    assert.isNull(result.data.data.createRecurringDonation);
    assert.equal(result.data.errors[0].message, errorMessages.UN_AUTHORIZED);
  });

  it('should return unAuthorized error when project not found', async () => {
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const accessToken = await generateTestAccessToken(contractCreator.id);
    const contractAddress = generateRandomEtheriumAddress();
    const result = await axios.post(
      graphqlUrl,
      {
        query: createRecurringDonationQuery,
        variables: {
          projectId: 99999,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomTxHash(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isNull(result.data.data.createRecurringDonation);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });

  it('should return error when project doesnt have anchorAddress on that network', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      { ...createProjectData(), networkId: NETWORK_IDS.MAIN_NET },
      projectOwner,
    );
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const accessToken = await generateTestAccessToken(donor.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: createRecurringDonationQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomTxHash(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isNull(result.data.data.createRecurringDonation);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.THERE_IS_NOT_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT,
    );
  });
}
