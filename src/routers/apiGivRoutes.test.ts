import { assert } from 'chai';
import { User, UserRole } from '../entities/user';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import { createDonation } from '../repositories/donationRepository';
import axios from 'axios';
export const restUrl = 'http://localhost:4000/apigive/donations';

describe('createDonation in apiGiv test cases', () => {
  it('should create donation ', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donationData = createDonationData();
    const walletAddress = generateRandomEtheriumAddress();
    donationData.toWalletAddress = walletAddress;
    donationData.projectId = project.id;
    const newDonation = await createDonation({
      donationAnonymous: false,
      donorUser: user,
      isProjectVerified: false,
      isTokenEligibleForGivback: false,
      project,
      segmentNotified: false,
      tokenAddress: '',
      transakId: '',
      transactionId: '9151faa1-e69b-4a36-b959-3c4f894afb68',
      transactionNetworkId: 10,
      toWalletAddress: '134',
      fromWalletAddress: '134',
      amount: 10,
      token: 'jgjbjbkjbnjknb',
    });

    const data = JSON.stringify(newDonation);

    const config = {
      method: 'post',
      url: restUrl,
      headers: {
        Authorization: 'Basic ZmF0ZW1laDEzNzk6MTltVml6bHhSY0REZDZRbjg3OGY=',
      },
      data,
    };

    const result = await axios(config);

    assert.isOk(newDonation);
    assert.equal(newDonation.projectId, project.id);
  });
});
