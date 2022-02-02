import { assert, expect } from 'chai';
import { createServerWithDummyUser } from '../server/testServerFactory';
import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
} from '../../test/testUtils';
import axios from 'axios';
import { errorMessages } from '../utils/errorMessages';
import { Donation } from '../entities/donation';
import { User } from '../entities/user';
import { fetchDonationsByDonorQuery } from '../../test/graphqlQueries';

let apolloServer;

// TODO Write test cases
// describe('donations() test cases', donationsTestCases);
// describe('donationsFromWallets() test cases', donationsFromWalletsTestCases);
// describe('donationsToWallets() test cases', donationsToWalletsTestCases);
// describe('donationsByProjectId() test cases', donationsByProjectIdTestCases);
// describe('tokens() test cases', tokensTestCases);
describe('donationsByDonor() test cases', donationsByDonorTestCases);
// describe('saveDonation() test cases', saveDonationTestCases);

// TODO I think we can delete  addUserVerification query
// describe('addUserVerification() test cases', addUserVerificationTestCases);

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

before(async () => {
  apolloServer = await createServerWithDummyUser();
});
