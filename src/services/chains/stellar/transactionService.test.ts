import { expect } from 'chai';
import sinon from 'sinon';
import { getStellarTransactionInfoFromNetwork } from './transactionService';
import { ChainType } from '../../../types/network';
import { NETWORK_IDS } from '../../../provider';
import {
  assertThrowsAsync,
  generateRandomStellarAddress,
  generateRandomStellarTxHash,
  horizonPaymentRecord,
  stubStellarHorizonPayments,
} from '../../../../test/testUtils';

describe(
  'getStellarTransactionInfoFromNetwork test cases',
  getStellarTransactionInfoFromNetworkTestCases,
);

function getStellarTransactionInfoFromNetworkTestCases() {
  afterEach(() => {
    sinon.restore();
  });

  function baseInput(overrides: Partial<any> = {}) {
    return {
      networkId: NETWORK_IDS.STELLAR_MAINNET,
      chainType: ChainType.STELLAR,
      symbol: 'XLM',
      txHash: generateRandomStellarTxHash(),
      fromAddress: generateRandomStellarAddress(),
      toAddress: generateRandomStellarAddress(),
      amount: 19.996,
      timestamp: Math.floor(Date.now() / 1000),
      ...overrides,
    };
  }

  it('should validate a single-operation payment transaction (existing behavior)', async () => {
    const input = baseInput();
    stubStellarHorizonPayments([
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: input.toAddress,
        amount: '19.9960000',
      }),
    ]);

    const info = await getStellarTransactionInfoFromNetwork(input as any);
    expect(info.to).to.equal(input.toAddress);
    expect(info.amount).to.equal(19.996);
  });

  it('should pick the payment operation targeting the expected recipient in a multi-operation (exchange batch) transaction', async () => {
    const input = baseInput();
    stubStellarHorizonPayments([
      // Another withdrawal in the same exchange batch, listed first
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: generateRandomStellarAddress(),
        amount: '55.0000000',
      }),
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: input.toAddress,
        amount: '19.9960000',
      }),
    ]);

    const info = await getStellarTransactionInfoFromNetwork(input as any);
    expect(info.to).to.equal(input.toAddress);
    expect(info.amount).to.equal(19.996);
  });

  it('should select the largest of several operations paying the same recipient, mirroring the QR matcher', async () => {
    const input = baseInput();
    stubStellarHorizonPayments([
      // A smaller operation to the same recipient, listed first: the QR
      // matcher credits the largest, so verification must resolve it too
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: input.toAddress,
        amount: '0.1000000',
      }),
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: input.toAddress,
        amount: '19.9960000',
      }),
    ]);

    const info = await getStellarTransactionInfoFromNetwork(input as any);
    expect(info.to).to.equal(input.toAddress);
    expect(info.amount).to.equal(19.996);
  });

  it('should prefer the operation matching the expected amount when a batch pays the recipient for two different donations', async () => {
    // Two donors' withdrawals to the same project address in one exchange
    // batch: this donation is the smaller op, so amount must outrank size
    const input = baseInput({ amount: 5 });
    stubStellarHorizonPayments([
      horizonPaymentRecord({
        txHash: input.txHash,
        to: input.toAddress,
        amount: '100.0000000',
      }),
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: input.toAddress,
        amount: '5.0000000',
      }),
    ]);

    const info = await getStellarTransactionInfoFromNetwork(input as any);
    expect(info.amount).to.equal(5);
    expect(info.from).to.equal(input.fromAddress);
  });

  it('should break an equal-amount tie between operations by the expected sender', async () => {
    // Two ops of the same amount to the same address, different senders;
    // only the sender distinguishes which one this donation refers to
    const input = baseInput({ amount: 5 });
    stubStellarHorizonPayments([
      horizonPaymentRecord({
        txHash: input.txHash,
        to: input.toAddress,
        amount: '5.0000000',
      }),
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: input.toAddress,
        amount: '5.0000000',
      }),
    ]);

    const info = await getStellarTransactionInfoFromNetwork(input as any);
    expect(info.from).to.equal(input.fromAddress);
    expect(info.amount).to.equal(5);
  });

  it('should reject a transaction much older than the donation (staleness check)', async () => {
    const input = baseInput();
    stubStellarHorizonPayments([
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: input.toAddress,
        amount: '19.9960000',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      }),
    ]);

    await assertThrowsAsync(
      () => getStellarTransactionInfoFromNetwork(input as any),
      undefined,
    );
  });

  it('should still reject a transaction none of whose operations pay the expected recipient', async () => {
    const input = baseInput();
    stubStellarHorizonPayments([
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: generateRandomStellarAddress(),
        amount: '19.9960000',
      }),
    ]);

    await assertThrowsAsync(
      () => getStellarTransactionInfoFromNetwork(input as any),
      undefined,
    );
  });

  it('should select a create_account operation funding the expected recipient', async () => {
    const input = baseInput({ amount: 100 });
    stubStellarHorizonPayments([
      horizonPaymentRecord({
        txHash: input.txHash,
        from: input.fromAddress,
        to: generateRandomStellarAddress(),
        amount: '55.0000000',
      }),
      horizonPaymentRecord({
        type: 'create_account',
        txHash: input.txHash,
        from: input.fromAddress,
        to: input.toAddress,
        amount: '100.0000000',
      }),
    ]);

    const info = await getStellarTransactionInfoFromNetwork(input as any);
    expect(info.to).to.equal(input.toAddress);
    expect(info.amount).to.equal(100);
  });
}
