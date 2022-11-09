import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomTxHash,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../../test/testUtils';
import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics';
import { DONATION_STATUS } from '../../entities/donation';
import { NETWORK_IDS } from '../../provider';
import DonationTracker from './DonationTracker';

describe(
  'segmentDonationAttributes() test cases',
  segmentDonationAttributesTestCases,
);

function segmentDonationAttributesTestCases() {
  it('should generate donation attributes when passing a donation', async () => {
    const transactionInfo = {
      txHash: generateRandomTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
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
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        nonce: 999999,
        valueUsd: 1,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const tracker = new DonationTracker(
      donation,
      project,
      user,
      NOTIFICATIONS_EVENT_NAMES.MADE_DONATION,
    );

    const segmentAttributes = tracker.segmentDonationAttributes();
    assert.equal(segmentAttributes.slug, project.slug);
    /* tslint:disable:no-string-literal */
    assert.equal(
      segmentAttributes['fromWalletAddress'],
      transactionInfo.fromAddress,
    );
  });

  it('should generate donation attributes but remove fromWalletAddress when event is donation received', async () => {
    const transactionInfo = {
      txHash: generateRandomTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
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
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        nonce: 999999,
        valueUsd: 1,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const tracker = new DonationTracker(
      donation,
      project,
      user,
      NOTIFICATIONS_EVENT_NAMES.DONATION_RECEIVED,
    );

    const segmentAttributes = tracker.segmentDonationAttributes();
    assert.equal(segmentAttributes.slug, project.slug);
    /* tslint:disable:no-string-literal */
    assert.notEqual(
      segmentAttributes['fromWalletAddress'],
      transactionInfo.fromAddress,
    );
    /* tslint:disable:no-string-literal */
    assert.equal(segmentAttributes['fromWalletAddress'], undefined);
  });
}
