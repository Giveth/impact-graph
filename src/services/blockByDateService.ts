import { getProvider, NETWORK_IDS } from '../provider';
import moment from 'moment';
import { logger } from '../utils/logger';
import { ethers } from 'ethers';

interface WrappedBlock {
  number: number;
  timestamp: number | string;
}

interface Block {
  block: number;
  date: string;
  timestamp: number | string;
}

// Copied mostly from https://github.com/monosux/ethereum-block-by-date/blob/a71dd26f6a6ffe26b3c2202d6666d52e00a63435/src/ethereum-block-by-date.js
class BlockByDate {
  provider: ethers.providers.Provider;
  checkedBlocks: {};
  savedBlocks: {};
  requests: number;
  latestBlock: WrappedBlock;
  firstBlock: WrappedBlock;
  blockTime: number | string;

  constructor(provider) {
    this.provider = provider;
    this.checkedBlocks = {};
    this.savedBlocks = {};
    this.requests = 0;
  }

  async getBoundaries() {
    this.latestBlock = await this.getBlockWrapper('latest');
    this.firstBlock = await this.getBlockWrapper(1);
    this.blockTime =
      (parseInt(this.latestBlock.timestamp as string, 10) -
        parseInt(this.firstBlock.timestamp as string, 10)) /
      (this.latestBlock.number - 1);
  }

  async getDate(
    _date: moment.Moment | moment.MomentInput,
    after = true,
    refresh = false,
  ): Promise<Block> {
    const date = !moment.isMoment(_date) ? moment(_date).utc() : _date;
    if (
      this.firstBlock === undefined ||
      this.latestBlock === undefined ||
      this.blockTime === undefined ||
      refresh
    ) {
      await this.getBoundaries();
    } else {
      this.latestBlock = await this.getBlockWrapper('latest');
    }

    if (date.isBefore(moment.unix(this.firstBlock.timestamp as number)))
      return this.returnWrapper(date.format(), 1);
    if (date.isSameOrAfter(moment.unix(this.latestBlock.timestamp as number)))
      return this.returnWrapper(date.format(), this.latestBlock.number);
    this.checkedBlocks[date.unix()] = [];
    const predictedBlock = await this.getBlockWrapper(
      Math.ceil(
        date.diff(moment.unix(this.firstBlock.timestamp as number), 'seconds') /
          +this.blockTime,
      ),
    );
    return this.returnWrapper(
      date.format(),
      await this.findBetter(date, predictedBlock, after),
    );
  }

  async findBetter(date, predictedBlock, after, blockTime = this.blockTime) {
    if (await this.isBetterBlock(date, predictedBlock, after))
      return predictedBlock.number;
    const difference = date.diff(
      moment.unix(predictedBlock.timestamp),
      'seconds',
    );
    let skip = Math.ceil(difference / (+blockTime === 0 ? 1 : +blockTime));
    if (skip === 0) skip = difference < 0 ? -1 : 1;
    const nextPredictedBlock = await this.getBlockWrapper(
      this.getNextBlock(date, predictedBlock.number, skip),
    );
    blockTime = Math.abs(
      (parseInt(predictedBlock.timestamp, 10) -
        parseInt(nextPredictedBlock.timestamp, 10)) /
        (parseInt(predictedBlock.number, 10) -
          parseInt(nextPredictedBlock.number, 10)),
    );
    return this.findBetter(date, nextPredictedBlock, after, blockTime);
  }

  async isBetterBlock(date, predictedBlock, after) {
    const blockTime = moment.unix(predictedBlock.timestamp);
    if (after) {
      if (blockTime.isBefore(date)) return false;
      const previousBlock = await this.getBlockWrapper(
        predictedBlock.number - 1,
      );
      if (
        blockTime.isSameOrAfter(date) &&
        moment.unix(previousBlock.timestamp).isBefore(date)
      )
        return true;
    } else {
      if (blockTime.isSameOrAfter(date)) return false;
      const nextBlock = await this.getBlockWrapper(predictedBlock.number + 1);
      if (
        blockTime.isBefore(date) &&
        moment.unix(nextBlock.timestamp).isSameOrAfter(date)
      )
        return true;
    }
    return false;
  }

  getNextBlock(date, currentBlock, skip) {
    let nextBlock = currentBlock + skip;
    if (nextBlock > this.latestBlock.number)
      nextBlock = this.latestBlock.number;
    if (this.checkedBlocks[date.unix()].includes(nextBlock))
      return this.getNextBlock(date, currentBlock, skip < 0 ? --skip : ++skip);
    this.checkedBlocks[date.unix()].push(nextBlock);
    return nextBlock < 1 ? 1 : nextBlock;
  }

  returnWrapper(date, block): Block {
    return { date, block, timestamp: this.savedBlocks[block].timestamp };
  }

  async getBlockWrapper(block) {
    if (this.savedBlocks[block]) return this.savedBlocks[block];
    logger.debug(
      'NODE RPC request count - getBlockWrapper  provider.getBlock:',
      block,
    );
    // tslint:disable-next-line:variable-name
    const { number, timestamp } = await this.provider.getBlock(block);
    this.savedBlocks[number] = {
      timestamp,
      number,
    };
    this.requests++;
    return this.savedBlocks[number];
  }
}

export const getBlockByTime = async (timeSecond: number): Promise<number> => {
  // Create the object again because using the same object caused returns null after a while!
  // It won't affect the performance, because each block will be seeked will be out of cached blocked
  const blockByDate = new BlockByDate(getProvider(NETWORK_IDS.XDAI));
  const block = await blockByDate.getDate(timeSecond * 1000);
  return block.block;
};
