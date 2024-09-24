import { expect } from 'chai';
import moment from 'moment';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import {
  findAllEarlyAccessRounds,
  findActiveEarlyAccessRound,
  fillMissingTokenPriceInQfRounds,
} from './earlyAccessRoundRepository';
import { saveRoundDirectlyToDb } from '../../test/testUtils';
import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';

class MockedCoingeckoPriceAdapter extends CoingeckoPriceAdapter {
  async getTokenPriceAtDate({
    symbol: _symbol,
    date: _date,
  }: {
    symbol: string;
    date: string;
  }): Promise<number> {
    return 100;
  }
}

describe('EarlyAccessRound Repository Test Cases', () => {
  let originalPriceAdapter: any;

  beforeEach(async () => {
    // Clean up data before each test case
    await EarlyAccessRound.delete({});

    // Mock the CoingeckoPriceAdapter to return a fixed value
    originalPriceAdapter = CoingeckoPriceAdapter;

    (global as any).CoingeckoPriceAdapter = MockedCoingeckoPriceAdapter;

    await EarlyAccessRound.update({}, { tokenPrice: undefined });
  });

  afterEach(async () => {
    // Clean up data after each test case
    await EarlyAccessRound.delete({});

    // Restore the original CoingeckoPriceAdapter
    (global as any).CoingeckoPriceAdapter = originalPriceAdapter;
  });

  it('should save a new Early Access Round directly to the database', async () => {
    const roundData = {
      roundNumber: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
    };

    const savedRound = await saveRoundDirectlyToDb(roundData);

    expect(savedRound).to.be.an.instanceof(EarlyAccessRound);
    expect(savedRound.roundNumber).to.equal(roundData.roundNumber);
    expect(savedRound.startDate.toISOString()).to.equal(
      roundData.startDate.toISOString(),
    );
    expect(savedRound.endDate.toISOString()).to.equal(
      roundData.endDate.toISOString(),
    );
  });

  it('should find all Early Access Rounds', async () => {
    // Save a couple of rounds first
    await saveRoundDirectlyToDb({
      roundNumber: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
    });
    await saveRoundDirectlyToDb({
      roundNumber: 2,
      startDate: new Date('2024-09-06'),
      endDate: new Date('2024-09-10'),
    });

    const rounds = await findAllEarlyAccessRounds();

    expect(rounds).to.be.an('array');
    expect(rounds.length).to.equal(2);
    expect(rounds[0]).to.be.an.instanceof(EarlyAccessRound);
    expect(rounds[1]).to.be.an.instanceof(EarlyAccessRound);
  });

  it('should find the active Early Access Round', async () => {
    const activeRoundData = {
      roundNumber: 1,
      startDate: new Date(new Date().setDate(new Date().getDate() - 1)), // yesterday
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // tomorrow
    };

    const inactiveRoundData = {
      roundNumber: 2,
      startDate: new Date(new Date().getDate() + 1),
      endDate: new Date(new Date().getDate() + 2),
    };

    // Save both active and inactive rounds
    await saveRoundDirectlyToDb(activeRoundData);
    await saveRoundDirectlyToDb(inactiveRoundData);

    const activeRound = await findActiveEarlyAccessRound();

    expect(activeRound).to.be.an.instanceof(EarlyAccessRound);
    expect(activeRound?.roundNumber).to.equal(activeRoundData.roundNumber);
    expect(activeRound?.startDate.toISOString()).to.equal(
      activeRoundData.startDate.toISOString(),
    );
    expect(activeRound?.endDate.toISOString()).to.equal(
      activeRoundData.endDate.toISOString(),
    );
  });

  it('should return null when no active Early Access Round is found', async () => {
    const activeRound = await findActiveEarlyAccessRound();
    expect(activeRound).to.be.null;
  });

  it('should update token price for rounds with null token_price', async () => {
    // Create a EarlyAccessRound with null token price
    const earlyAccessRound = EarlyAccessRound.create({
      roundNumber: Math.floor(Math.random() * 10000),
      startDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
      tokenPrice: undefined,
    });
    await EarlyAccessRound.save(earlyAccessRound);

    const updatedCount = await fillMissingTokenPriceInQfRounds();

    const updatedEarlyAcccessRound = await EarlyAccessRound.findOne({
      where: { id: earlyAccessRound.id },
    });
    expect(updatedEarlyAcccessRound?.tokenPrice).to.equal(100);
    expect(updatedCount).to.equal(1);
  });

  it('should not update token price for rounds with existing token_price', async () => {
    // Create a EarlyAccessRound with an existing token price
    const earlyAccessRound = EarlyAccessRound.create({
      roundNumber: Math.floor(Math.random() * 10000),
      startDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
      tokenPrice: 50,
    });
    await EarlyAccessRound.save(earlyAccessRound);

    const updatedCount = await fillMissingTokenPriceInQfRounds();

    const updatedEarlyAcccessRound = await EarlyAccessRound.findOne({
      where: { id: earlyAccessRound.id },
    });
    expect(updatedEarlyAcccessRound?.tokenPrice).to.equal(50);
    expect(updatedCount).to.equal(undefined);
  });

  it('should return zero if there are no rounds to update', async () => {
    // Ensure no rounds with null token_price
    await EarlyAccessRound.update({}, { tokenPrice: 100 });

    const updatedCount = await fillMissingTokenPriceInQfRounds();

    expect(updatedCount).to.equal(undefined);
  });
});
