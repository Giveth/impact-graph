import moment from 'moment';
import { assert } from 'chai';
import axios from 'axios';
import { NETWORK_IDS } from '../provider';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveRecurringDonationDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  createRecurringDonationQuery,
  fetchRecurringDonationsByDateQuery,
  fetchRecurringDonationsByProjectIdQuery,
  fetchRecurringDonationsByUserIdQuery,
  updateRecurringDonationQuery,
  updateRecurringDonationQueryById,
  updateRecurringDonationStatusMutation,
} from '../../test/graphqlQueries';

import { errorMessages } from '../utils/errorMessages';
import { addNewAnchorAddress } from '../repositories/anchorContractAddressRepository';
import { RECURRING_DONATION_STATUS } from '../entities/recurringDonation';
import { QfRound } from '../entities/qfRound';
import { generateRandomString } from '../utils/utils';
import { ORGANIZATION_LABELS } from '../entities/organization';

describe(
  'recurringDonationEligibleProjects test cases',
  recurringDonationEligibleProjectsTestCases,
);

describe(
  'createRecurringDonation test cases',
  createRecurringDonationTestCases,
);

describe(
  'updateRecurringDonation test cases',
  updateRecurringDonationTestCases,
);
describe(
  'recurringDonationsByProjectId test cases',
  recurringDonationsByProjectIdTestCases,
);

describe(
  'recurringDonationsByUserId test cases',
  recurringDonationsByUserIdTestCases,
);

describe(
  'updateRecurringDonationStatus test cases',
  updateRecurringDonationStatusTestCases,
);

describe(
  'updateRecurringDonationById test cases',
  updateRecurringDonationByIdTestCases,
);

describe(
  'recurringDonationsByProjectDate test cases',
  recurringDonationsByProjectDateTestCases,
);

function recurringDonationEligibleProjectsTestCases() {
  it('should return eligible projects with their anchor contracts', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const project = await saveProjectDirectlyToDb(
      {
        ...createProjectData(),
        isGivbackEligible: true,
      },
      projectOwner,
    );

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: projectOwner,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const anchorContractAddressBASE = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: projectOwner,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.BASE_MAINNET,
      txHash: generateRandomEvmTxHash(),
    });

    const result = await axios.post(graphqlUrl, {
      query: `
          query {
            recurringDonationEligibleProjects {
              id
              slug
              title
              anchorContracts {
                address
                networkId
                isActive
              }
            }
          }
        `,
    });

    assert.isNotNull(result.data.data.recurringDonationEligibleProjects);
    const foundProject =
      result.data.data.recurringDonationEligibleProjects.find(
        p => p.id === project.id,
      );

    assert.isNotNull(
      foundProject,
      'Project should be found in eligible projects',
    );
    assert.equal(foundProject.slug, project.slug);
    assert.equal(foundProject.title, project.title);
    assert.equal(foundProject.anchorContracts.length, 2);

    // Assert Optimistic anchor contract
    const optimisticContract = foundProject.anchorContracts.find(
      contract => contract.networkId === NETWORK_IDS.OPTIMISTIC,
    );
    assert.isNotNull(optimisticContract);
    assert.equal(optimisticContract.address, anchorContractAddress.address);

    // Assert BASE anchor contract
    const baseContract = foundProject.anchorContracts.find(
      contract => contract.networkId === NETWORK_IDS.BASE_MAINNET,
    );
    assert.isNotNull(baseContract);
    assert.equal(baseContract.address, anchorContractAddressBASE.address);
  });
}

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

    await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
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
          txHash: generateRandomEvmTxHash(),
          flowRate: '100',
          currency: 'GIV',
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
    assert.equal(result.data.data.createRecurringDonation.anonymous, false);
    assert.equal(result.data.data.createRecurringDonation.isBatch, false);
  });
  it('should create recurringDonation successfully with anonymous true', async () => {
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

    await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
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
          txHash: generateRandomEvmTxHash(),
          flowRate: '100',
          currency: 'GIV',
          anonymous: true,
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
    assert.equal(result.data.data.createRecurringDonation.anonymous, true);
  });
  it('should create recurringDonation successfully with isBatch true', async () => {
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

    await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
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
          txHash: generateRandomEvmTxHash(),
          flowRate: '100',
          currency: 'GIV',
          isBatch: true,
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
    assert.equal(result.data.data.createRecurringDonation.isBatch, true);
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

    await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const result = await axios.post(graphqlUrl, {
      query: createRecurringDonationQuery,
      variables: {
        projectId: project.id,
        networkId: NETWORK_IDS.OPTIMISTIC,
        txHash: generateRandomEvmTxHash(),
        flowRate: '100',
        currency: 'GIV',
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
    const result = await axios.post(
      graphqlUrl,
      {
        query: createRecurringDonationQuery,
        variables: {
          projectId: 99999,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomEvmTxHash(),
          flowRate: '100',
          currency: 'GIV',
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
          txHash: generateRandomEvmTxHash(),
          flowRate: '100',
          currency: 'GIV',
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

  it('should return error when project belongs to endaoment and doesnt accepp recurring donation', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      {
        ...createProjectData(),
        networkId: NETWORK_IDS.MAIN_NET,
        organizationLabel: ORGANIZATION_LABELS.ENDAOMENT,
      },
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
          txHash: generateRandomEvmTxHash(),
          flowRate: '100',
          currency: 'GIV',
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
      errorMessages.PROJECT_DOESNT_ACCEPT_RECURRING_DONATION,
    );
  });
}

function updateRecurringDonationTestCases() {
  it('should allow to end recurring donation when its active, and archive when its ended', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: user,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'ETH',
        networkId: NETWORK_IDS.OPTIMISTIC,
        donorId: donor.id,
        anchorContractAddressId: anchorContractAddress.id,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    assert.equal(donation.status, RECURRING_DONATION_STATUS.ACTIVE);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
          status: RECURRING_DONATION_STATUS.ENDED,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParams.status,
      RECURRING_DONATION_STATUS.ENDED,
    );

    const archivingResult = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
          isArchived: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      archivingResult.data.data.updateRecurringDonationParams.isArchived,
      true,
    );
  });
  it('should not allow to archive  recurring donation when its not ended', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: user,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'ETH',
        networkId: NETWORK_IDS.OPTIMISTIC,
        donorId: donor.id,
        anchorContractAddressId: anchorContractAddress.id,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    assert.equal(donation.status, RECURRING_DONATION_STATUS.ACTIVE);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
          isArchived: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParams.isArchived,
      false,
    );
  });
  it('should not change isArchived when its already true and we dont send it', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: user,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'ETH',
        networkId: NETWORK_IDS.OPTIMISTIC,
        donorId: donor.id,
        anchorContractAddressId: anchorContractAddress.id,
        status: RECURRING_DONATION_STATUS.ENDED,
        isArchived: true,
      },
    });
    assert.equal(donation.isArchived, true);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParams.isArchived,
      true,
    );
  });
  it('should not change isArchived when its already false and we dont send it', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: user,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'ETH',
        networkId: NETWORK_IDS.OPTIMISTIC,
        donorId: donor.id,
        anchorContractAddressId: anchorContractAddress.id,
        status: RECURRING_DONATION_STATUS.ENDED,
        isArchived: false,
      },
    });
    assert.equal(donation.isArchived, false);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParams.isArchived,
      false,
    );
  });

  it('should update recurring donation successfully', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency,
      },
    });

    assert.equal(donation.flowRate, '300');

    const accessToken = await generateTestAccessToken(donor.id);
    const flowRate = '201';
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          flowRate,
          currency,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomEvmTxHash(),
          anonymous: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParams.flowRate,
      flowRate,
    );
    assert.isTrue(result.data.data.updateRecurringDonationParams.anonymous);
  });
  it('should update recurring donation successfully for project that is related to a QF', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    await QfRound.update({}, { isActive: false });
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      slug: generateRandomString(10),
      allocatedFund: 100,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    project.qfRounds = [qfRound];
    await project.save();
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency,
      },
    });

    assert.equal(donation.flowRate, '300');

    const accessToken = await generateTestAccessToken(donor.id);
    const flowRate = '201';
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          projectId: project.id,
          flowRate,
          currency,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomEvmTxHash(),
          anonymous: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParams.flowRate,
      flowRate,
    );
    assert.isTrue(result.data.data.updateRecurringDonationParams.anonymous);
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should change status and isFinished when updating flowRate and txHash ', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency,
        finished: true,
      },
    });

    assert.equal(donation.flowRate, '300');

    const accessToken = await generateTestAccessToken(donor.id);
    const flowRate = '201';
    const txHash = generateRandomEvmTxHash();
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          projectId: project.id,
          flowRate,
          currency,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash,
          anonymous: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParams.flowRate,
      flowRate,
    );
    assert.isFalse(result.data.data.updateRecurringDonationParams.finished);
    assert.equal(
      result.data.data.updateRecurringDonationParams.status,
      RECURRING_DONATION_STATUS.PENDING,
    );
    assert.equal(result.data.data.updateRecurringDonationParams.txHash, txHash);
    assert.equal(
      result.data.data.updateRecurringDonationParams.flowRate,
      flowRate,
    );
  });
  it('should not change txHash when flowRate has not sent ', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency,
        finished: true,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    assert.equal(donation.flowRate, '300');

    const accessToken = await generateTestAccessToken(donor.id);
    const txHash = generateRandomEvmTxHash();
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          projectId: project.id,
          currency,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash,
          anonymous: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.data.updateRecurringDonationParams.status,
      RECURRING_DONATION_STATUS.ACTIVE,
    );
    assert.notEqual(
      result.data.data.updateRecurringDonationParams.txHash,
      txHash,
    );
  });
  it('should not change flowRate when txHash has not sent ', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency,
        finished: true,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    assert.equal(donation.flowRate, '300');

    const accessToken = await generateTestAccessToken(donor.id);
    const flowRate = '201';
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          projectId: project.id,
          flowRate,
          currency,
          networkId: NETWORK_IDS.OPTIMISTIC,
          anonymous: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.notEqual(
      result.data.data.updateRecurringDonationParams.flowRate,
      flowRate,
    );
    assert.equal(
      result.data.data.updateRecurringDonationParams.status,
      RECURRING_DONATION_STATUS.ACTIVE,
    );
  });

  it('should get error when someone wants to update someone else recurring donation', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });
    assert.equal(donation.status, RECURRING_DONATION_STATUS.PENDING);
    const anotherUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const accessToken = await generateTestAccessToken(anotherUser.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          projectId: project.id,
          flowRate: '10',
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomEvmTxHash(),
          anonymous: false,
          currency,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.RECURRING_DONATION_NOT_FOUND,
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

    await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const result = await axios.post(graphqlUrl, {
      query: updateRecurringDonationQuery,
      variables: {
        projectId: project.id,
        networkId: NETWORK_IDS.OPTIMISTIC,
        txHash: generateRandomEvmTxHash(),
        flowRate: '100',
        anonymous: true,
        currency: 'GIV',
      },
    });

    assert.isNull(result.data.data.updateRecurringDonationParams);
    assert.equal(result.data.errors[0].message, errorMessages.UN_AUTHORIZED);
  });

  it('should return unAuthorized error when project not found', async () => {
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const accessToken = await generateTestAccessToken(contractCreator.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQuery,
        variables: {
          projectId: 99999,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomEvmTxHash(),
          flowRate: '100',
          anonymous: true,
          currency: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isNull(result.data.data.updateRecurringDonationParams);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
}

function updateRecurringDonationByIdTestCases() {
  it('should allow to end recurring donation when its active, and archive when its ended', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: user,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'ETH',
        networkId: NETWORK_IDS.OPTIMISTIC,
        donorId: donor.id,
        anchorContractAddressId: anchorContractAddress.id,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    assert.equal(donation.status, RECURRING_DONATION_STATUS.ACTIVE);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
          status: RECURRING_DONATION_STATUS.ENDED,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.status,
      RECURRING_DONATION_STATUS.ENDED,
    );

    const archivingResult = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
          isArchived: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      archivingResult.data.data.updateRecurringDonationParamsById.isArchived,
      true,
    );
  });
  it('should not allow to archive  recurring donation when its not ended', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: user,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'ETH',
        networkId: NETWORK_IDS.OPTIMISTIC,
        donorId: donor.id,
        anchorContractAddressId: anchorContractAddress.id,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    assert.equal(donation.status, RECURRING_DONATION_STATUS.ACTIVE);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
          isArchived: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.isArchived,
      false,
    );
  });
  it('should not change isArchived when its already true and we dont send it', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: user,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'ETH',
        networkId: NETWORK_IDS.OPTIMISTIC,
        donorId: donor.id,
        anchorContractAddressId: anchorContractAddress.id,
        status: RECURRING_DONATION_STATUS.ENDED,
        isArchived: true,
      },
    });
    assert.equal(donation.isArchived, true);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.isArchived,
      true,
    );
  });
  it('should not change isArchived when its already false and we dont send it', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: user,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'ETH',
        networkId: NETWORK_IDS.OPTIMISTIC,
        donorId: donor.id,
        anchorContractAddressId: anchorContractAddress.id,
        status: RECURRING_DONATION_STATUS.ENDED,
        isArchived: false,
      },
    });
    assert.equal(donation.isArchived, false);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.isArchived,
      false,
    );
  });

  it('should update recurring donation successfully', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency,
      },
    });

    assert.equal(donation.flowRate, '300');

    const accessToken = await generateTestAccessToken(donor.id);
    const flowRate = '201';
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          flowRate,
          currency,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomEvmTxHash(),
          anonymous: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.flowRate,
      flowRate,
    );
    assert.isTrue(result.data.data.updateRecurringDonationParamsById.anonymous);
  });
  it('should change status and isFinished when updating flowRate and txHash ', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency,
        finished: true,
      },
    });

    assert.equal(donation.flowRate, '300');

    const accessToken = await generateTestAccessToken(donor.id);
    const flowRate = '201';
    const txHash = generateRandomEvmTxHash();
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          flowRate,
          currency,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash,
          anonymous: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.flowRate,
      flowRate,
    );
    assert.isFalse(result.data.data.updateRecurringDonationParamsById.finished);
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.status,
      RECURRING_DONATION_STATUS.PENDING,
    );
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.txHash,
      txHash,
    );
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.flowRate,
      flowRate,
    );
  });
  it('should not change txHash when flowRate has not sent ', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency,
        finished: true,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    assert.equal(donation.flowRate, '300');

    const accessToken = await generateTestAccessToken(donor.id);
    const txHash = generateRandomEvmTxHash();
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          currency,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash,
          anonymous: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.data.updateRecurringDonationParamsById.status,
      RECURRING_DONATION_STATUS.ACTIVE,
    );
    assert.notEqual(
      result.data.data.updateRecurringDonationParamsById.txHash,
      txHash,
    );
  });
  it('should not change flowRate when txHash has not sent ', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency,
        finished: true,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    assert.equal(donation.flowRate, '300');

    const accessToken = await generateTestAccessToken(donor.id);
    const flowRate = '201';
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: donation.id,
          projectId: project.id,
          flowRate,
          currency,
          networkId: NETWORK_IDS.OPTIMISTIC,
          anonymous: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.notEqual(
      result.data.data.updateRecurringDonationParamsById.flowRate,
      flowRate,
    );
    assert.equal(
      result.data.data.updateRecurringDonationParamsById.status,
      RECURRING_DONATION_STATUS.ACTIVE,
    );
  });

  it('should get error when someone wants to update someone else recurring donation', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070 * 1000,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
      },
    });
    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });
    assert.equal(donation.status, RECURRING_DONATION_STATUS.PENDING);
    const anotherUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const accessToken = await generateTestAccessToken(anotherUser.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: recurringDonation.id,
          projectId: project.id,
          flowRate: '10',
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomEvmTxHash(),
          anonymous: false,
          currency,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.RECURRING_DONATION_NOT_FOUND,
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

    await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: donor,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const result = await axios.post(graphqlUrl, {
      query: updateRecurringDonationQueryById,
      variables: {
        recurringDonationId: 1,
        projectId: project.id,
        networkId: NETWORK_IDS.OPTIMISTIC,
        txHash: generateRandomEvmTxHash(),
        flowRate: '100',
        anonymous: true,
        currency: 'GIV',
      },
    });

    assert.isNull(result.data.data.updateRecurringDonationParamsById);
    assert.equal(result.data.errors[0].message, errorMessages.UN_AUTHORIZED);
  });

  it('should return unAuthorized error when project not found', async () => {
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const accessToken = await generateTestAccessToken(contractCreator.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationQueryById,
        variables: {
          recurringDonationId: 1,
          projectId: 99999,
          networkId: NETWORK_IDS.OPTIMISTIC,
          txHash: generateRandomEvmTxHash(),
          flowRate: '100',
          anonymous: true,
          currency: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isNull(result.data.data.updateRecurringDonationParamsById);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
}

function recurringDonationsByProjectIdTestCases() {
  it('should sort by the createdAt DESC', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          orderBy: {
            field: 'createdAt',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 2);
    for (let i = 0; i < donations.length - 1; i++) {
      assert.isTrue(donations[i].createdAt >= donations[i + 1].createdAt);
    }
  });
  it('should sort by the createdAt ASC', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          orderBy: {
            field: 'createdAt',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 2);
    for (let i = 0; i < donations.length - 1; i++) {
      assert.isTrue(donations[i].createdAt <= donations[i + 1].createdAt);
    }
  });
  it('should sort by the flowRate ASC', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        flowRate: '1000',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        flowRate: '2000',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          orderBy: {
            field: 'flowRate',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 2);
    for (let i = 0; i < donations.length - 1; i++) {
      // assertion flor big int of flowRates
      assert.isTrue(
        BigInt(donations[i].flowRate) <= BigInt(donations[i + 1].flowRate),
      );
    }
  });
  it('should sort by the flowRate DESC', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        flowRate: '100',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        flowRate: '2000',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          orderBy: {
            field: 'flowRate',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 2);
    for (let i = 0; i < donations.length - 1; i++) {
      assert.isTrue(
        BigInt(donations[i].flowRate) >= BigInt(donations[i + 1].flowRate),
      );
    }
  });
  it('should search by the currency', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'USDT',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        currency: 'GIV',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          searchTerm: 'GIV',
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 1);
    assert.equal(donations[0].currency, 'GIV');
  });
  it('should search by the flowRate', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        flowRate: '100',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        flowRate: '200',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          searchTerm: '100',
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 1);
    assert.equal(donations[0].flowRate, '100');
  });
  it('should search by the failed status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'failed',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'verified',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'pending',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: 'failed',
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 1);
    assert.equal(donations[0].status, 'failed');
  });
  it('should search by the pending status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'failed',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'verified',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'pending',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: 'pending',
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 1);
    assert.equal(donations[0].status, 'pending');
  });
  it('should search by the verified status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'failed',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'verified',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'pending',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: 'verified',
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 1);
    assert.equal(donations[0].status, 'verified');
  });
  it('should filter include archived ones when passing includeArchived:true', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'verified',
      },
    });

    const archivedRecurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'verified',
        isArchived: true,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          includeArchived: true,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 2);
    assert.isOk(
      donations.find(d => Number(d.id) === archivedRecurringDonation.id),
    );
    assert.isOk(donations.find(d => Number(d.id) === recurringDonation.id));
  });
  it('should not include archived ones when passing includeArchived:false', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'verified',
      },
    });

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'verified',
        isArchived: true,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          includeArchived: false,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 1);
    assert.equal(donations[0].isArchived, false);
  });
  it('should return non archived if we dont send includeArchived field', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'verified',
        isArchived: false,
      },
    });

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        status: 'verified',
        isArchived: true,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          orderBy: {
            field: 'createdAt',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByProjectId.recurringDonations;

    assert.equal(result.data.data.recurringDonationsByProjectId.totalCount, 1);
    assert.isOk(donations.find(d => Number(d.id) === recurringDonation.id));
  });
}

function recurringDonationsByUserIdTestCases() {
  it('should sort by the createdAt DESC', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          orderBy: {
            field: 'createdAt',
            direction: 'DESC',
          },
        },
      },
      {},
    );
    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 2);
    for (let i = 0; i < donations.length - 1; i++) {
      assert.isTrue(donations[i].createdAt >= donations[i + 1].createdAt);
    }
  });
  it('should sort by the createdAt ASC', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          orderBy: {
            field: 'createdAt',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 2);
    for (let i = 0; i < donations.length - 1; i++) {
      assert.isTrue(donations[i].createdAt <= donations[i + 1].createdAt);
    }
  });
  it('should sort by the flowRate ASC', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        flowRate: '100',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        flowRate: '200',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          orderBy: {
            field: 'flowRate',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 2);
    for (let i = 0; i < donations.length - 1; i++) {
      assert.isTrue(
        BigInt(donations[i].flowRate) <= BigInt(donations[i + 1].flowRate),
      );
    }
  });
  it('should sort by the flowRate DESC', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        flowRate: '100',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        flowRate: '200',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          orderBy: {
            field: 'flowRate',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 2);
    for (let i = 0; i < donations.length - 1; i++) {
      assert.isTrue(
        BigInt(donations[i].flowRate) >= BigInt(donations[i + 1].flowRate),
      );
    }
  });
  it('should filter by two tokens', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const d1 = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        currency: 'DAI',
      },
    });
    const d2 = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        currency: 'USDC',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        currency: 'USDT',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          filteredTokens: ['DAI', 'USDC'],
        },
      },
      {},
    );
    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 2);
    assert.isOk(donations.find(d => Number(d.id) === d1.id));
    assert.isOk(donations.find(d => Number(d.id) === d2.id));
  });
  it('should filter by one token', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const d1 = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        currency: 'DAI',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        currency: 'USDT',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        currency: 'USDT',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          filteredTokens: ['DAI'],
        },
      },
      {},
    );
    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 1);
    assert.isOk(donations.find(d => Number(d.id) === d1.id));
  });
  it('should join with anchor contracts', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(createProjectData());
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: projectOwner,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        projectId: project.id,
        currency: 'DAI',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
        },
      },
      {},
    );
    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 1);
    assert.equal(
      donations[0].project.anchorContracts[0].id,
      anchorContractAddress.id,
    );
  });
  it('should not filter if filteredTokens is not passing', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const d1 = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        currency: 'DAI',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        currency: 'USDC',
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        currency: 'USDT',
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
        },
      },
      {},
    );
    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 3);
    assert.isOk(donations.find(d => Number(d.id) === d1.id));
  });
  it('should filter by finishStatus filter both active and ended', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const d1 = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        finished: true,
      },
    });
    const d2 = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        finished: false,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          finishStatus: { active: true, ended: true },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 2);
    assert.isOk(donations.find(d => Number(d.id) === d1.id));
    assert.isOk(donations.find(d => Number(d.id) === d2.id));
  });
  it('should return just not finished recurring donations when not passing finishStatus', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const d1 = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        finished: true,
      },
    });
    const d2 = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        finished: false,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 1);
    assert.isNotOk(donations.find(d => Number(d.id) === d1.id));
    assert.isOk(donations.find(d => Number(d.id) === d2.id));
  });
  it('should filter by finishStatus filter just active', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const endedOne = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        finished: true,
      },
    });
    const activeOne = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        finished: false,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          finishStatus: { active: true, ended: false },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 1);
    assert.isOk(donations.find(d => Number(d.id) === activeOne.id));
    assert.isNotOk(donations.find(d => Number(d.id) === endedOne.id));
  });
  it('should filter by finishStatus filter just ended', async () => {
    await saveProjectDirectlyToDb(createProjectData());
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const endedOne = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        finished: true,
      },
    });
    const activeOne = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        finished: false,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          finishStatus: { active: false, ended: true },
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 1);
    assert.isNotOk(donations.find(d => Number(d.id) === activeOne.id));
    assert.isOk(donations.find(d => Number(d.id) === endedOne.id));
  });
  it('should filter by status and return active recurring donations', async () => {
    await saveProjectDirectlyToDb(createProjectData());
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const activeDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });
    const pendingDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        status: RECURRING_DONATION_STATUS.PENDING,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          status: RECURRING_DONATION_STATUS.ACTIVE,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 1);
    assert.isOk(donations.find(d => Number(d.id) === activeDonation.id));
    assert.isNotOk(donations.find(d => Number(d.id) === pendingDonation.id));
  });
  it('should filter include archived ones when passing includeArchived:true', async () => {
    await saveProjectDirectlyToDb(createProjectData());
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        status: RECURRING_DONATION_STATUS.ACTIVE,
        isArchived: false,
      },
    });
    const archivedRecurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        status: RECURRING_DONATION_STATUS.PENDING,
        isArchived: true,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          includeArchived: true,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 2);
    assert.isOk(
      donations.find(d => Number(d.id) === archivedRecurringDonation.id),
    );
    assert.isOk(donations.find(d => Number(d.id) === recurringDonation.id));
  });
  it('should not include archived ones when passing includeArchived:false', async () => {
    await saveProjectDirectlyToDb(createProjectData());
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        status: RECURRING_DONATION_STATUS.ACTIVE,
        isArchived: false,
      },
    });
    const archivedRecurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        status: RECURRING_DONATION_STATUS.PENDING,
        isArchived: true,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
          includeArchived: false,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 1);
    assert.isNotOk(
      donations.find(d => Number(d.id) === archivedRecurringDonation.id),
    );
    assert.isOk(donations.find(d => Number(d.id) === recurringDonation.id));
  });
  it('should return non archived if we dont send includeArchived field', async () => {
    await saveProjectDirectlyToDb(createProjectData());
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        status: RECURRING_DONATION_STATUS.ACTIVE,
        isArchived: false,
      },
    });
    const archivedRecurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
        status: RECURRING_DONATION_STATUS.PENDING,
        isArchived: true,
      },
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByUserIdQuery,
        variables: {
          userId: donor.id,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 1);
    assert.isNotOk(
      donations.find(d => Number(d.id) === archivedRecurringDonation.id),
    );
    assert.isOk(donations.find(d => Number(d.id) === recurringDonation.id));
  });
}

function updateRecurringDonationStatusTestCases() {
  it('should donation status remain pending after calling without sending status (we assume its not mined so far)', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });
    assert.equal(donation.status, RECURRING_DONATION_STATUS.PENDING);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationStatusMutation,
        variables: {
          donationId: donation.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationStatus.status,
      RECURRING_DONATION_STATUS.PENDING,
    );
  });

  it('should update donation status to failed, tx is not mined and donor says it failed', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '200',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070 * 1000,
    };
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: donor.id,
      },
    });
    assert.equal(donation.status, RECURRING_DONATION_STATUS.PENDING);

    const accessToken = await generateTestAccessToken(donor.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateRecurringDonationStatusMutation,
        variables: {
          donationId: donation.id,
          status: RECURRING_DONATION_STATUS.FAILED,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateRecurringDonationStatus.status,
      RECURRING_DONATION_STATUS.FAILED,
    );
  });
}

function recurringDonationsByProjectDateTestCases() {
  it('should return recurring donations within a specific date range', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    // Create donations with different createdAt dates
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-02-01T00:00:00Z'),
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-03-01T00:00:00Z'),
      },
    });

    // Define the date range
    const startDate = '2024-01-01T00:00:00Z';
    const endDate = '2024-02-15T23:59:59Z';

    // Make the GraphQL query
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByDateQuery,
        variables: {
          projectId: project.id,
          startDate,
          endDate,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByDate.recurringDonations;

    // Assertions
    assert.equal(donations.length, 2);
    assert.isTrue(
      new Date(donations[0].createdAt) >= new Date(startDate) &&
        new Date(donations[0].createdAt) <= new Date(endDate),
      'The donation should be within the specified date range',
    );
  });

  it('should return all recurring donations if startDate and endDate are not provided', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    // Create donations with different createdAt dates
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-02-01T00:00:00Z'),
      },
    });

    // Make the GraphQL query without startDate and endDate
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByDateQuery,
        variables: {
          projectId: project.id,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByDate.recurringDonations;

    // Assertions
    assert.equal(donations.length, 2, 'All donations should be returned');
  });

  it('should return recurring donations up to the provided endDate when startDate is not provided', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    // Create donations with different createdAt dates
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-02-01T00:00:00Z'),
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-03-01T00:00:00Z'),
      },
    });

    // Define the endDate without providing startDate
    const endDate = '2024-02-15T23:59:59Z';

    // Make the GraphQL query without startDate
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByDateQuery,
        variables: {
          projectId: project.id,
          endDate,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByDate.recurringDonations;

    // Assertions
    assert.equal(
      donations.length,
      2,
      'Should return donations up to the provided endDate',
    );
    assert.isTrue(new Date(donations[0].createdAt) <= new Date(endDate));
    assert.isTrue(new Date(donations[1].createdAt) <= new Date(endDate));
  });

  it('should return recurring donations from the provided startDate when endDate is not provided', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    // Create donations with different createdAt dates
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-02-01T00:00:00Z'),
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-03-01T00:00:00Z'),
      },
    });

    // Define the startDate without providing endDate
    const startDate = '2024-02-01T00:00:00Z';

    // Make the GraphQL query without endDate
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByDateQuery,
        variables: {
          projectId: project.id,
          startDate,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByDate.recurringDonations;

    // Assertions
    assert.equal(
      donations.length,
      2,
      'Should return donations from the provided startDate onward',
    );
    assert.isTrue(new Date(donations[0].createdAt) >= new Date(startDate));
    assert.isTrue(new Date(donations[1].createdAt) >= new Date(startDate));
  });

  it('should return an empty list if no donations are within the date range', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    // Create donations outside the date range
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    });
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        createdAt: new Date('2024-02-01T00:00:00Z'),
      },
    });

    // Define a date range with no donations
    const startDate = '2024-03-01T00:00:00Z';
    const endDate = '2024-03-31T23:59:59Z';

    // Make the GraphQL query
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecurringDonationsByDateQuery,
        variables: {
          projectId: project.id,
          startDate,
          endDate,
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByDate.recurringDonations;

    // Assertions
    assert.equal(donations.length, 0, 'No donations should be returned');
  });
}
