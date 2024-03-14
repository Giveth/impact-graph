import { NETWORK_IDS } from '../provider';
import {
  createDonationData,
  createProjectData,
  DONATION_SEED_DATA,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  generateTestAccessToken,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveRecurringDonationDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { assert } from 'chai';
import axios from 'axios';
import {
  createRecurringDonationQuery,
  fetchRecurringDonationsByProjectIdQuery,
  fetchRecurringDonationsByUserIdQuery,
  updateRecurringDonationQuery,
  updateRecurringDonationStatusMutation,
} from '../../test/graphqlQueries';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { addNewAnchorAddress } from '../repositories/anchorContractAddressRepository';
import { RECURRING_DONATION_STATUS } from '../entities/recurringDonation';

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

    const anchorContractAddress = await addNewAnchorAddress({
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
    const contractAddress = generateRandomEtheriumAddress();
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
}

function updateRecurringDonationTestCases() {
  it('should allow to end recurringdonation when its active, and archive when its ended', async () => {
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      flowRate: '1000',
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070,
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
          projectId: project.id,
          networkId: donation.networkId,
          currency: donation.currency,
          status: RECURRING_DONATION_STATUS.ARCHIVED,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      archivingResult.data.data.updateRecurringDonationParams.status,
      RECURRING_DONATION_STATUS.ARCHIVED,
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
      timestamp: 1647069070,
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

  it('should get error when someone wants to update someone else recurring donation', async () => {
    const currency = 'GIV';
    const transactionInfo = {
      txHash: generateRandomEvmTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency,
      timestamp: 1647069070,
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

    const anchorContractAddress = await addNewAnchorAddress({
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
    const d2 = await saveRecurringDonationDirectlyToDb({
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
  it('should not filter if filteredTokens is not passing', async () => {
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
        },
      },
      {},
    );
    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 3);
    assert.isOk(donations.find(d => Number(d.id) === d1.id));
  });
  it('should filter by finishStatus filter both true and false', async () => {
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
          finishStatus: [true, false],
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
  it('should filter by finishStatus filter just true', async () => {
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
          finishStatus: [true],
        },
      },
      {},
    );

    const donations =
      result.data.data.recurringDonationsByUserId.recurringDonations;
    assert.equal(result.data.data.recurringDonationsByUserId.totalCount, 1);
    assert.isOk(donations.find(d => Number(d.id) === d1.id));
    assert.isNotOk(donations.find(d => Number(d.id) === d2.id));
  });
  it('should filter by finishStatus filter just false', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
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
          finishStatus: [false],
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
      timestamp: 1647069070,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
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
      timestamp: 1647069070,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
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
