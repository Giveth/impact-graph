import { assert } from 'chai';
import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
  DONATION_SEED_DATA,
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomTxHash,
  generateRandomEtheriumAddress,
} from '../../test/testUtils';
import axios from 'axios';
import { errorMessages } from '../utils/errorMessages';
import { Donation } from '../entities/donation';
import {
  fetchDonationsByUserIdQuery,
  fetchDonationsByDonorQuery,
  saveDonation,
} from '../../test/graphqlQueries';
import { NETWORK_IDS } from '../provider';
import { User } from '../entities/user';
import { ORGANIZATION_LABELS } from '../entities/organization';

// TODO Write test cases
// describe('donations() test cases', donationsTestCases);
// describe('donationsFromWallets() test cases', donationsFromWalletsTestCases);
// describe('donationsToWallets() test cases', donationsToWalletsTestCases);
// describe('donationsByProjectId() test cases', donationsByProjectIdTestCases);
describe('donationByUserId() test cases', donationsByUserIdTestCases);
// describe('tokens() test cases', tokensTestCases);
describe('donationsByDonor() test cases', donationsByDonorTestCases);
describe('saveDonation() test cases', saveDonationTestCases);

// TODO I think we can delete  addUserVerification query
// describe('addUserVerification() test cases', addUserVerificationTestCases);

function saveDonationTestCases() {
  it('should save GIV donation for giveth project on xdai successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
  });
  it('should save GIV donation for giveth project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
  });
  it('should save GIV donation for trace project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
  });
  it('should save GIV donation for trace project on xdai successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
  });
  it('should throw error when save GIV donation for givingBlock project on xdai', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  it('should throw error when save GIV donation for givingBlock project on mainnet', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  it('should save ETH donation for givingBlock project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'ETH',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
  });
}

function donationsByUserIdTestCases() {
  it('should sort by tokens donated DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'TokenAmount',
            direction: 'DESC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(donations[0].amount > donations[donationsCount - 1].amount);
  });
  it('should sort by tokens donated ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'TokenAmount',
            direction: 'ASC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(donations[0].amount < donations[donationsCount - 1].amount);
  });
  it('should sort by USD value donated DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'UsdAmount',
            direction: 'DESC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      donations[0].valueUsd > donations[donationsCount - 1].valueUsd,
    );
  });
  it('should sort by USD value donated ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'UsdAmount',
            direction: 'ASC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      donations[0].valueUsd < donations[donationsCount - 1].valueUsd,
    );
  });
  it('should sort by createdAt DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'DESC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      Date.parse(donations[0].createdAt) >
        Date.parse(donations[donationsCount - 1].createdAt),
    );
  });
  it('should sort by createdAt ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      Date.parse(donations[0].createdAt) <
        Date.parse(donations[donationsCount - 1].createdAt),
    );
  });
  describe('with default createdAt DESC sort', () => {
    it('should paginate results by indicated take and skip', async () => {
      const result = await axios.post(
        graphqlUrl,
        {
          query: fetchDonationsByUserIdQuery,
          variables: {
            take: 1,
            skip: 1,
            userId: SEED_DATA.FIRST_USER.id,
          },
        },
        {},
      );

      const donations = result.data.data.donationsByUserId.donations;
      const donationsCount = donations.length;
      assert.equal(donationsCount, 1);
      assert.isTrue(
        donations[0].id !== String(DONATION_SEED_DATA.FIRST_DONATION.id),
      );
    });
  });
}

function donationsByDonorTestCases() {
  it('should return the user made donations', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const firstUserDonations = await Donation.find({
      where: { user: { id: SEED_DATA.FIRST_USER.id } },
    });
    const firstUserResult = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByDonorQuery,
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );

    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const secondUserResult = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByDonorQuery,
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );

    assert.equal(
      firstUserResult.data.data.donationsByDonor.length,
      firstUserDonations.length,
    );
    assert.equal(
      firstUserResult.data.data.donationsByDonor[0].fromWalletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    assert.equal(
      firstUserResult.data.data.donationsByDonor[1].fromWalletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    // second user has no donations
    assert.deepEqual(secondUserResult.data.data.donationsByDonor, []);
  });
  it('should return <<Login Required>> error if user is not signed in', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByDonorQuery,
      },
      {},
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.DONATION_VIEWING_LOGIN_REQUIRED,
    );
  });
}
