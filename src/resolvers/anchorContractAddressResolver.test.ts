import { assert } from 'chai';
import axios from 'axios';
import { NETWORK_IDS } from '../provider.js';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils.js';
import { createAnchorContractAddressQuery } from '../../test/graphqlQueries.js';
import {
  errorMessages,
  translationErrorMessagesKeys,
} from '../utils/errorMessages.js';
import { addNewAnchorAddress } from '../repositories/anchorContractAddressRepository.js';
import { AnchorContractAddress } from '../entities/anchorContractAddress.js';
import { findUserByWalletAddress } from '../repositories/userRepository.js';

describe(
  'addAnchorContractAddress test cases',
  addAnchorContractAddressTestCases,
);

function addAnchorContractAddressTestCases() {
  //TODO for writing success test cases we shoul be able to set id for the project
  // but we can't set id for the project because it is auto generated

  it('should get invalid projectId error', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x7af6b35466b651a43dab0d06e066c421416e5b340c62e5a54124b3eac346297a
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const project = await saveProjectDirectlyToDb(
      {
        ...createProjectData(),
      },
      projectOwner,
    );

    const fromWalletAddress = '0x871cd6353b803ceceb090bb827ecb2f361db81ab';
    const contractCreator =
      (await findUserByWalletAddress(fromWalletAddress)) ||
      (await saveUserDirectlyToDb(fromWalletAddress));

    const accessToken = await generateTestAccessToken(contractCreator.id);
    const contractAddress = '0x4AAcca72145e1dF2aeC137E1f3C5E3D75DB8b5f3';
    const result = await axios.post(
      graphqlUrl,
      {
        query: createAnchorContractAddressQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          address: contractAddress,
          txHash:
            '0x7af6b35466b651a43dab0d06e066c421416e5b340c62e5a54124b3eac346297a',
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
      translationErrorMessagesKeys.INVALID_PROJECT_ID,
    );

    await AnchorContractAddress.delete({ id: result.data.data.id });
  });
  it('should get invalid projectId error', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x545f669af1370b8f5e6457008e6ce2a78f8b8ab5d486104bff52c094024298c2
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const project = await saveProjectDirectlyToDb(
      {
        ...createProjectData(),
      },
      projectOwner,
    );

    const fromWalletAddress = '0x8f48094a12c8f99d616ae8f3305d5ec73cbaa6b6';
    const contractCreator =
      (await findUserByWalletAddress(fromWalletAddress)) ||
      (await saveUserDirectlyToDb(fromWalletAddress));

    const accessToken = await generateTestAccessToken(contractCreator.id);
    const contractAddress = '0x1190f5ac0f509d8f3f4b662bf17437d37d64527c';
    const result = await axios.post(
      graphqlUrl,
      {
        query: createAnchorContractAddressQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          address: contractAddress,
          txHash: generateRandomEvmTxHash(),
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
      translationErrorMessagesKeys.TX_NOT_FOUND,
    );

    await AnchorContractAddress.delete({ id: result.data.data.id });
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
        txHash: generateRandomEvmTxHash(),
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
          txHash: generateRandomEvmTxHash(),
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
      txHash: generateRandomEvmTxHash(),
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
          txHash: generateRandomEvmTxHash(),
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
      errorMessages.THERE_IS_AN_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT,
    );
  });

  it('should return error when project already has anchor contract address and creator is the project owner', async () => {
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
      txHash: generateRandomEvmTxHash(),
    });

    const accessToken = await generateTestAccessToken(projectOwner.id);
    const contractAddress = generateRandomEtheriumAddress();
    const result = await axios.post(
      graphqlUrl,
      {
        query: createAnchorContractAddressQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.OPTIMISTIC,
          address: contractAddress,
          txHash: generateRandomEvmTxHash(),
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
      errorMessages.THERE_IS_AN_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT,
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
          txHash: generateRandomEvmTxHash(),
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
