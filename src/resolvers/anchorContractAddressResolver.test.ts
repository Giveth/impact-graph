import { NETWORK_IDS } from '../provider';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { DONATION_STATUS } from '../entities/donation';
import { assert } from 'chai';
import axios from 'axios';
import {
  createAnchorContractAddressQuery,
  updateDonationStatusMutation,
} from '../../test/graphqlQueries';
import { errorMessages } from '../utils/errorMessages';
import { addNewAnchorAddress } from '../repositories/anchorContractAddressRepository';

describe(
  'addAnchorContractAddress test cases',
  addAnchorContractAddressTestCases,
);

function addAnchorContractAddressTestCases() {
  it('should create anchorContractAddress successfully', async () => {
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

    const accessToken = await generateTestAccessToken(contractCreator.id);
    const contractAddress = generateRandomEtheriumAddress();
    const result = await axios.post(
      graphqlUrl,
      {
        query: createAnchorContractAddressQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.OPTIMISTIC,
          address: contractAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isTrue(result.data.data.addAnchorContractAddress.isActive);
  });

  it('should return unAuthorized error when not sending JWT', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const contractAddress = generateRandomEtheriumAddress();
    const result = await axios.post(graphqlUrl, {
      query: createAnchorContractAddressQuery,
      variables: {
        projectId: project.id,
        networkId: NETWORK_IDS.OPTIMISTIC,
        address: contractAddress,
      },
    });
    assert.isNull(result.data.data.addAnchorContractAddress);
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
        query: createAnchorContractAddressQuery,
        variables: {
          projectId: 999999,
          networkId: NETWORK_IDS.OPTIMISTIC,
          address: contractAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isNull(result.data.data.addAnchorContractAddress);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });

  it('should return error when project already has anchor contract address and creator is not the project owner', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    await addNewAnchorAddress({
      address: generateRandomEtheriumAddress(),
      project,
      creator: projectOwner,
      networkId: NETWORK_IDS.OPTIMISTIC,
      owner: projectOwner,
    });
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const accessToken = await generateTestAccessToken(contractCreator.id);
    const contractAddress = generateRandomEtheriumAddress();
    const result = await axios.post(
      graphqlUrl,
      {
        query: createAnchorContractAddressQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.OPTIMISTIC,
          address: contractAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isNull(result.data.data.addAnchorContractAddress);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.THERE_IS_AN_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT_ONLY_ADMIN_CAN_CHANGE_IT,
    );
  });

  it('should return error when project doesnt have recipient address on that network', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      { ...createProjectData(), networkId: NETWORK_IDS.MAIN_NET },
      projectOwner,
    );
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const accessToken = await generateTestAccessToken(contractCreator.id);
    const contractAddress = generateRandomEtheriumAddress();
    const result = await axios.post(
      graphqlUrl,
      {
        query: createAnchorContractAddressQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.OPTIMISTIC,
          address: contractAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isNull(result.data.data.addAnchorContractAddress);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_DOESNT_HAVE_RECIPIENT_ADDRESS_ON_THIS_NETWORK,
    );
  });
}
