import { assert } from 'chai';
import { User, UserRole } from '../entities/user';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import axios from 'axios';
import { createBasicAuthentication } from '../utils/utils';

export const restUrl = 'http://localhost:4000/apigive/donations';

describe('createDonation in apiGiv test cases', () => {
  it('should create donation ', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const walletAddress = generateRandomEtheriumAddress();
    const user = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const title = String(new Date().getTime());
    const projectData = {
      title,
      description: 'test description',
      walletAddress,
      categories: ['food1'],
      verified: true,
      listed: true,
      giveBacks: false,
      creationDate: new Date(),
      updatedAt: new Date(),
      slug: title,
      qualityScore: 30,
      totalDonations: 10,
      admin: String(user.id),
      totalReactions: 0,
      totalProjectUpdates: 1,
    };
    const project = await saveProjectDirectlyToDb(projectData);
    const donationData = createDonationData();
    donationData.toWalletAddress = walletAddress;
    const basicAuthentication = createBasicAuthentication({
      userName: 'testApiGive',
      password: '123',
    });

    const newDonation = {
      donationAnonymous: false,
      donorUser: user,
      isProjectVerified: false,
      segmentNotified: false,
      tokenAddress: '',
      transakId: '',
      transactionId: '9151faa1-e69b-4a36-b959-3c4f894afb68',
      transactionNetworkId: 10,
      toWalletAddress: walletAddress,
      fromWalletAddress: generateRandomEtheriumAddress(),
      amount: 10,
      token: 'jgj',
      currency: 'fdd',
      status: 'active',
      isFiat: true,
      project,
    };
    const result = await axios.post(restUrl, newDonation, {
      headers: {
        Authorization: basicAuthentication,
      },
    });

    assert.isOk(result.data);
  });
});
