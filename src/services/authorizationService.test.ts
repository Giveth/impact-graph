import { assert } from 'chai';
import {
  generateRandomEtheriumAddress,
  generateTestAccessToken,
} from '../../test/testUtils';
import { User } from '../entities/user';
import Axios from 'axios';
import { authorizationHandler } from './authorizationServices';
import config from '../config';
import { ethers } from 'ethers';
import { findUserByWalletAddress } from '../repositories/userRepository';

describe('authorizationHandler() test cases', authorizationHandlerTestCases);

// tslint:disable-next-line:no-var-requires
const siwe = require('siwe');

const domain = 'localhost';
const origin = 'https://serve.giveth.io';

function authorizationHandlerTestCases() {
  it('should decode user jwt with current impact graph authorization', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: `${new Date().getTime()}-giveth@giveth.com`,
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    const accessToken = await generateTestAccessToken(user.id);
    const jwtUser = await authorizationHandler('1', accessToken);
    assert.equal(jwtUser.userId, user.id);
  });
  it('should decode user jwt with the auth microservice', async () => {
    const privateKey = process.env.PRIVATE_ETHERS_TEST_KEY as string;
    const publicKey = process.env.PUBLIC_ETHERS_TEST_KEY as string;
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: `${new Date().getTime()}-giveth@giveth.com`,
      url: 'website url',
      loginType: 'wallet',
      walletAddress: publicKey,
    };
    const user = await User.create(userData).save();
    const nonceRoute = config.get('AUTH_MICROSERVICE_NONCE_URL') as string;
    const nonceResult = await Axios.get(nonceRoute);
    const wallet = new ethers.Wallet(privateKey);

    const siweMessage = new siwe.SiweMessage({
      domain,
      address: publicKey,
      nonce: nonceResult.data.message, // verification servers gives
      statement: 'This is a test statement.',
      uri: origin,
      version: '1',
      chainId: '1',
    });
    const textMessage = siweMessage.prepareMessage();
    const signature = await wallet.signMessage(textMessage);

    const authenticationRoute = config.get(
      'AUTH_MICROSERVICE_AUTHENTICATION_URL',
    ) as string;
    const authenticationResult = await Axios.post(authenticationRoute, {
      message: textMessage,
      nonce: nonceResult.data.message,
      signature,
    });

    const accessToken = authenticationResult.data.jwt;
    const jwtUser = await authorizationHandler('2', accessToken);
    assert.equal(jwtUser.userId, user.id);
  });
  it('should decode jwt and create user if it is nonexistent', async () => {
    const privateKey = process.env.PRIVATE_ETHERS_SECONDARY_TEST_KEY as string;
    const publicKey = process.env.PUBLIC_ETHERS_SECONDARY_TEST_KEY as string;
    const nonceRoute = config.get('AUTH_MICROSERVICE_NONCE_URL') as string;
    const nonceResult = await Axios.get(nonceRoute);
    const wallet = new ethers.Wallet(privateKey);

    const siweMessage = new siwe.SiweMessage({
      domain,
      address: publicKey,
      nonce: nonceResult.data.message, // verification servers gives
      statement: 'This is a test statement.',
      uri: origin,
      version: '1',
      chainId: '1',
    });
    const textMessage = siweMessage.prepareMessage();
    const signature = await wallet.signMessage(textMessage);

    const authenticationRoute = config.get(
      'AUTH_MICROSERVICE_AUTHENTICATION_URL',
    ) as string;
    const authenticationResult = await Axios.post(authenticationRoute, {
      message: textMessage,
      nonce: nonceResult.data.message,
      signature,
    });

    const accessToken = authenticationResult.data.jwt;
    const jwtUser = await authorizationHandler('2', accessToken);

    // user should have been created
    const user = await findUserByWalletAddress(publicKey);
    assert.equal(jwtUser.userId, user!.id);
    assert.equal(user!.walletAddress, publicKey.toLowerCase());
  });
}
