import { getBlockByTime } from './blockByDateService';
import { assert } from 'chai';
import { getProvider, NETWORK_IDS } from '../provider';
import { sleep } from '../utils/utils';

describe('block by date tests', () => {
  it('should return correct value for constant pair of block and time', async () => {
    const benchmark: [number, number][] = [
      [21278677, 1648132730],
      [20000000, 1641651650],
      [15000000, 1615691275],
      [11278677, 1596390990],
    ];

    for (const [block, time] of benchmark) {
      const result = await getBlockByTime(time);
      assert.equal(result, block);
    }
  });

  it('should return closest block to a random time', async () => {
    const provider = getProvider(NETWORK_IDS.XDAI);
    const firstBlock = await provider.getBlock(1);
    const now = Math.floor(Date.now() / 1000);
    // A random time between 1970-01-01 and two minutes ago

    const time =
      +firstBlock.timestamp +
      Math.floor(Math.random() * (now - 120 - +firstBlock.timestamp));
    const blockNumber = await getBlockByTime(time);

    const [previousBlock, nextBlock] = await Promise.all([
      provider.getBlock(blockNumber - 1),
      provider.getBlock(blockNumber + 1),
    ]);
    assert.isBelow(time, +nextBlock.timestamp);
    assert.isAbove(time, +previousBlock.timestamp);
  });

  it('should return correct balance after delay', async () => {
    const provider = getProvider(NETWORK_IDS.XDAI);
    let [block, blockNumber] = await Promise.all([
      provider.getBlock('latest'),
      getBlockByTime(Date.now() / 1000),
    ]);

    assert.isAtLeast(blockNumber, block.number - 1);

    await sleep(20000); // about 3 blocks
    [block, blockNumber] = await Promise.all([
      provider.getBlock('latest'),
      getBlockByTime(Date.now() / 1000),
    ]);
    assert.isAtLeast(blockNumber, block.number - 1);
  });
});
