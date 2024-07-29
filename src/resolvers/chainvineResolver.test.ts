import axios from 'axios';
import { assert } from 'chai';
import {
  generateHexNumber,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveUserDirectlyToDb,
} from '../../test/testUtils.js';
import {
  registerClickOnChainvineQuery,
  registerOnChainvineQuery,
} from '../../test/graphqlQueries.js';
import { findReferredEventByUserId } from '../repositories/referredEventRepository.js';

describe('Register on chainvine test cases', registerOnChainvineTestCases);
describe(
  'RegisterClick on Chainvine test cases',
  registerClickOnChainvineTestCases,
);

function registerOnChainvineTestCases() {
  it('should register on chainvine an return a user with chainvineId', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: registerOnChainvineQuery,
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isNotEmpty(result.data.data.registerOnChainvine.chainvineId);
    assert.isString(result.data.data.registerOnChainvine.chainvineId);
  });
}

function registerClickOnChainvineTestCases() {
  it('should register the user clicks on chainvine and update db', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const referrerUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    referrerUser.chainvineId = generateHexNumber(10);
    await referrerUser.save();

    const result = await axios.post(graphqlUrl, {
      query: registerClickOnChainvineQuery,
      variables: {
        referrerId: referrerUser.chainvineId,
        walletAddress: user.walletAddress,
      },
    });
    const updatedUser = result.data.data.registerClickEvent;
    assert.isTrue(updatedUser.wasReferred);
    assert.isFalse(updatedUser.isReferrer);

    const createdReferredEvent = await findReferredEventByUserId(user.id);
    assert.equal(createdReferredEvent!.referrerId, referrerUser.chainvineId);
    assert.equal(createdReferredEvent!.referrerId, referrerUser.chainvineId);
    assert.isTrue(createdReferredEvent!.isDonorLinkedToReferrer);
    assert.isTrue(createdReferredEvent!.isDonorClickEventSent);
    assert.instanceOf(createdReferredEvent!.startTime, Date);
  });
}
