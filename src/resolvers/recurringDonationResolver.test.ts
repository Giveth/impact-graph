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
  fetchDonationsByProjectIdQuery,
  fetchRecurringDonationsByProjectIdQuery,
} from '../../test/graphqlQueries';
import { errorMessages } from '../utils/errorMessages';
import { addNewAnchorAddress } from '../repositories/anchorContractAddressRepository';
import { Donation, DONATION_STATUS } from '../entities/donation';

describe(
  'createRecurringDonation test cases',
  createRecurringDonationTestCases,
);
describe('donationsByProjectId test cases', donationsByProjectIdTestCases);

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
      txHash: generateRandomEvmTxHash(),
    });

    const result = await axios.post(graphqlUrl, {
      query: createRecurringDonationQuery,
      variables: {
        projectId: project.id,
        networkId: NETWORK_IDS.OPTIMISTIC,
        txHash: generateRandomEvmTxHash(),
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

function donationsByProjectIdTestCases() {
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
            field: 'CreatedAt',
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
  it('should sort by createdAt ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.isTrue(donations[1].createdAt >= donations[0].createdAt);
  });
  it('should sort by amount DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'TokenAmount',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      Number(donations[0].id),
      DONATION_SEED_DATA.SECOND_DONATION.id,
    );
  });
  it('should sort by amount ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'TokenAmount',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(Number(donations[0].id), DONATION_SEED_DATA.FIFTH_DONATION.id);
  });
  it('should sort by valueUsd DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'UsdAmount',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      Number(donations[0].id),
      DONATION_SEED_DATA.SECOND_DONATION.id,
    );
  });
  it('should sort by valueUsd ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'UsdAmount',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(Number(donations[0].id), DONATION_SEED_DATA.FIFTH_DONATION.id);
  });
  it('should search by user name except anonymous donations', async () => {
    const anonymousDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.THIRD_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    anonymousDonation.anonymous = true;
    await anonymousDonation.save();

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: 'third',
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      Number(donations[0]?.id),
      DONATION_SEED_DATA.FIFTH_DONATION.id,
    );

    const anonymousDonations = donations.filter(d => d.anonymous === true);
    assert.isTrue(anonymousDonations.length === 0);
  });

  // TODO Fix this test case because it sometimes fails
  // it('should search by donation amount', async () => {
  //   const donation = await saveDonationDirectlyToDb(
  //     createDonationData(),
  //     SEED_DATA.THIRD_USER.id,
  //     SEED_DATA.FIRST_PROJECT.id,
  //   );
  //   donation.status = DONATION_STATUS.VERIFIED;
  //   donation.amount = 100;
  //   await donation.save();
  //   const result = await axios.post(
  //     graphqlUrl,
  //     {
  //       query: fetchDonationsByProjectIdQuery,
  //       variables: {
  //         projectId: SEED_DATA.FIRST_PROJECT.id,
  //         searchTerm: '100',
  //       },
  //     },
  //     {},
  //   );
  //   const amountDonationsCount = await Donation.createQueryBuilder('donation')
  //     .where('donation.amount = :amount', { amount: 100 })
  //     .getCount();
  //   const donations = result.data.data.donationsByProjectId.donations;
  //   assert.equal(donations[0]?.amount, 100);
  //   assert.equal(donations.length, amountDonationsCount);
  // });

  it('should search by donation currency', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: DONATION_SEED_DATA.FIRST_DONATION.currency, // GIV
        },
      },
      {},
    );

    const GivDonationsCount = await Donation.createQueryBuilder('donation')
      .where('donation.currency = :currency', {
        currency: DONATION_SEED_DATA.FIRST_DONATION.currency,
      })
      .getCount();

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      donations[0]?.currency,
      DONATION_SEED_DATA.FIRST_DONATION.currency,
    );
    assert.equal(donations.length, GivDonationsCount);
  });
  it('should search by donation ToWalletAddress', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: DONATION_SEED_DATA.FIRST_DONATION.toWalletAddress,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(d =>
      assert.equal(d.toWalletAddress, SEED_DATA.FIRST_PROJECT.walletAddress),
    );

    assert.isTrue(donations.length > 0);
  });
  it('should filter donations by failed status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: DONATION_STATUS.FAILED,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.FAILED);
    });
    assert.isOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should filter donations by pending status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: DONATION_STATUS.PENDING,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.PENDING);
    });
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should filter donations by verified status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: DONATION_STATUS.VERIFIED,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.VERIFIED);
    });
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should return all donations when not sending status filter', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.isOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
}
