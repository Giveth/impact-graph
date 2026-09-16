import { assert } from 'chai';
import axios from 'axios';
import sinon from 'sinon';
import { GivPowerSubgraphAdapter } from './givPowerSubgraphAdapter';

describe('GivPowerSubgraphAdapter', () => {
  const adapter = new GivPowerSubgraphAdapter();
  const address = '0x00d18ca9782be1caef611017c2fbc1a39779a57c';
  const missingAddress = '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c';
  const block = { number: 123456, timestamp: 1700000000 };
  let post: sinon.SinonStub;
  let originalUrl: string | undefined;
  let originalContract: string | undefined;

  beforeEach(() => {
    originalUrl = process.env.GIV_POWER_SUBGRAPH_URL;
    originalContract = process.env.GIV_POWER_UNIPOOL_CONTRACT_ID;
    process.env.GIV_POWER_SUBGRAPH_URL = 'https://subgraph.example/graphql';
    process.env.GIV_POWER_UNIPOOL_CONTRACT_ID = '0xABCDEF';
    post = sinon.stub(axios, 'post');
  });

  afterEach(() => {
    post.restore();
    if (originalUrl === undefined) delete process.env.GIV_POWER_SUBGRAPH_URL;
    else process.env.GIV_POWER_SUBGRAPH_URL = originalUrl;
    if (originalContract === undefined)
      delete process.env.GIV_POWER_UNIPOOL_CONTRACT_ID;
    else process.env.GIV_POWER_UNIPOOL_CONTRACT_ID = originalContract;
  });

  it('returns indexed block metadata', async () => {
    post.resolves({ data: { data: { _meta: { block } } } });
    assert.deepEqual(await adapter.getLatestIndexedBlockInfo(), block);
    assert.equal(post.firstCall.args[0], 'https://subgraph.example/graphql');
    assert.include(post.firstCall.args[1].query, '_meta');
  });

  for (const data of [
    { errors: [{ message: 'Subgraph unavailable' }] },
    { data: null },
    { data: { _meta: null } },
    { data: { _meta: { block } }, errors: [{ message: 'Partial result' }] },
  ]) {
    it(`rejects unavailable or partial metadata: ${JSON.stringify(data)}`, async () => {
      post.resolves({ data });
      try {
        await adapter.getLatestIndexedBlockInfo();
        assert.fail('Expected a subgraph error');
      } catch (error) {
        assert.equal(
          error.message,
          'GIVpower subgraph failed to return indexed block metadata',
        );
      }
    });
  }

  it('converts balances and fills missing wallets with zero at the requested block', async () => {
    post.resolves({
      data: {
        data: {
          unipoolBalances: [
            {
              user: { id: address },
              balance: '1234560000000000000',
              updatedAt: 123,
            },
          ],
        },
      },
    });
    const result = await adapter.getUserPowerBalanceAtBlockNumber({
      walletAddresses: [address, missingAddress],
      blockNumber: block.number,
    });
    assert.deepEqual(result, {
      [address]: { balance: 1.23, updatedAt: 123 },
      [missingAddress]: { balance: 0, updatedAt: 0 },
    });
    const query = post.firstCall.args[1].query;
    assert.include(query, `number:${block.number}`);
    assert.include(query, address);
    assert.include(query, missingAddress);
    assert.include(query, 'unipool: "0xabcdef"');
  });

  it('returns zero balances when no requested wallets exist', async () => {
    post.resolves({ data: { data: { unipoolBalances: [] } } });
    assert.deepEqual(
      await adapter.getUserPowerBalanceAtBlockNumber({
        walletAddresses: [address],
        blockNumber: block.number,
      }),
      { [address]: { balance: 0, updatedAt: 0 } },
    );
  });

  it('queries updated balances with timestamp, block and pagination', async () => {
    post.resolves({
      data: {
        data: {
          unipoolBalances: [
            {
              user: { id: address },
              balance: '2500000000000000000',
              updatedAt: 200,
            },
          ],
        },
      },
    });
    assert.deepEqual(
      await adapter.getUserPowerBalanceUpdatedAfterTimestamp({
        blockNumber: block.number,
        timestamp: 150,
        take: 10,
        skip: 20,
      }),
      { [address]: { balance: 2.5, updatedAt: 200 } },
    );
    const query = post.firstCall.args[1].query;
    for (const expected of [
      'updatedAt_gt: 150',
      'first: 10',
      'skip: 20',
      `number:${block.number}`,
      'orderBy: updatedAt',
      'orderDirection: asc',
    ])
      assert.include(query, expected);
  });

  it('propagates transport failures', async () => {
    const failure = new Error('Network unavailable');
    post.rejects(failure);
    try {
      await adapter.getLatestIndexedBlockInfo();
      assert.fail('Expected a transport error');
    } catch (error) {
      assert.strictEqual(error, failure);
    }
  });
});
