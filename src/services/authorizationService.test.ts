import { assert } from 'chai';
import {
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { authorizationHandler } from './authorizationServices';

describe('authorizationHandler() test cases', authorizationHandlerTestCases);

// eslint-disable-next-line @typescript-eslint/no-var-requires

const domain = 'localhost';
const origin = 'https://giveth.io';

function authorizationHandlerTestCases() {
  it('should decode user jwt with current impact graph authorization', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const jwtUser = await authorizationHandler('1', accessToken);
    assert.equal(jwtUser.userId, user.id);
  });
  // it('should decode user jwt with the auth microservice', async () => {
  //   const privateKey = process.env.PRIVATE_ETHERS_SECONDARY_TEST_KEY as string;
  //   const publicKey = process.env.PUBLIC_ETHERS_SECONDARY_TEST_KEY as string;

  //   const user = await saveUserDirectlyToDb(publicKey);
  //   const nonceRoute = config.get('AUTH_MICROSERVICE_NONCE_URL') as string;
  //   const nonceResult = await Axios.get(nonceRoute);
  //   const wallet = new ethers.Wallet(privateKey);

  //   const siweMessage = new SiweMessage({
  //     domain,
  //     address: publicKey,
  //     nonce: nonceResult.data.message, // verification servers gives
  //     statement: 'This is a test statement.',
  //     uri: origin,
  //     version: '1',
  //     chainId: 1,
  //   });
  //   const textMessage = siweMessage.prepareMessage();
  //   const signature = await wallet.signMessage(textMessage);

  //   const authenticationRoute = config.get(
  //     'AUTH_MICROSERVICE_AUTHENTICATION_URL',
  //   ) as string;
  //   const authenticationResult = await Axios.post(authenticationRoute, {
  //     message: textMessage,
  //     nonce: nonceResult.data.message,
  //     signature,
  //   });

  //   const accessToken = authenticationResult.data.jwt;
  //   const jwtUser = await authorizationHandler('2', accessToken);
  //   assert.equal(jwtUser.userId, user.id);
  //   await User.delete(user.id);
  // });
  // it('should decode jwt and create user if it is nonexistent', async () => {
  //   const privateKey = process.env.PRIVATE_ETHERS_SECONDARY_TEST_KEY as string;
  //   const publicKey = process.env.PUBLIC_ETHERS_SECONDARY_TEST_KEY as string;
  //   const nonceRoute = config.get('AUTH_MICROSERVICE_NONCE_URL') as string;
  //   const nonceResult = await Axios.get(nonceRoute);
  //   const wallet = new ethers.Wallet(privateKey);

  //   const siweMessage = new SiweMessage({
  //     domain,
  //     address: publicKey,
  //     nonce: nonceResult.data.message, // verification servers gives
  //     statement: 'This is a test statement.',
  //     uri: origin,
  //     version: '1',
  //     chainId: 1,
  //   });
  //   const textMessage = siweMessage.prepareMessage();
  //   const signature = await wallet.signMessage(textMessage);

  //   const authenticationRoute = config.get(
  //     'AUTH_MICROSERVICE_AUTHENTICATION_URL',
  //   ) as string;

  //   const authenticationResult = await Axios.post(authenticationRoute, {
  //     message: textMessage,
  //     nonce: nonceResult.data.message,
  //     signature,
  //   });

  //   const accessToken = authenticationResult.data.jwt;
  //   const jwtUser = await authorizationHandler('2', accessToken);

  //   // user should have been created
  //   const user = await findUserByWalletAddress(publicKey);
  //   assert.equal(jwtUser.userId, user!.id);
  //   assert.equal(user!.walletAddress, publicKey.toLowerCase());
  // });
}
