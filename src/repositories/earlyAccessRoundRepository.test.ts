import { expect } from 'chai';
import moment from 'moment';
import sinon from 'sinon';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import {
  findAllEarlyAccessRounds,
  findActiveEarlyAccessRound,
  fillMissingTokenPriceInEarlyAccessRounds,
} from './earlyAccessRoundRepository';
import {
  generateEARoundNumber,
  saveEARoundDirectlyToDb,
} from '../../test/testUtils';
import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';
import { QACC_DONATION_TOKEN_COINGECKO_ID } from '../constants/qacc';

describe('EarlyAccessRound Repository Test Cases', () => {
  let priceAdapterStub: sinon.SinonStub;

  beforeEach(async () => {
    // Clean up data before each test case
    await EarlyAccessRound.delete({});

    // Stub CoingeckoPriceAdapter to mock getTokenPriceAtDate
    priceAdapterStub = sinon
      .stub(CoingeckoPriceAdapter.prototype, 'getTokenPriceAtDate')
      .resolves(100);

    // Reset tokenPrice to undefined for test consistency
    await EarlyAccessRound.update({}, { tokenPrice: undefined });
  });

  afterEach(async () => {
    // Clean up data after each test case
    await EarlyAccessRound.delete({});

    // Restore the stubbed method after each test
    priceAdapterStub.restore();
  });

  it('should save a new Early Access Round directly to the database', async () => {
    const roundData = {
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
    };

    const savedRound = await saveEARoundDirectlyToDb(roundData);

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
    await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
    });
    await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
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
      roundNumber: generateEARoundNumber(),
      startDate: new Date(new Date().setDate(new Date().getDate() - 1)), // yesterday
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // tomorrow
    };

    const inactiveRoundData = {
      roundNumber: generateEARoundNumber(),
      startDate: new Date(new Date().getDate() + 1),
      endDate: new Date(new Date().getDate() + 2),
    };

    // Save both active and inactive rounds
    await saveEARoundDirectlyToDb(activeRoundData);
    await saveEARoundDirectlyToDb(inactiveRoundData);

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

  it('should update token price for rounds with null tokenPrice', async () => {
    // Create a EarlyAccessRound with null token price
    const earlyAccessRound = EarlyAccessRound.create({
      roundNumber: Math.floor(Math.random() * 10000),
      startDate: moment().subtract(3, 'days').toDate(),
      endDate: moment().add(10, 'days').toDate(),
      tokenPrice: undefined,
    });
    await EarlyAccessRound.save(earlyAccessRound);

    const updatedCount = await fillMissingTokenPriceInEarlyAccessRounds();

    const updatedEarlyAcccessRound = await EarlyAccessRound.findOne({
      where: { id: earlyAccessRound.id },
    });

    // Assert that the token price fetching method was called with the correct date
    sinon.assert.calledWith(priceAdapterStub, {
      symbol: QACC_DONATION_TOKEN_COINGECKO_ID,
      date: earlyAccessRound.startDate,
    });

    expect(updatedEarlyAcccessRound?.tokenPrice).to.equal(100);
    expect(updatedCount).to.equal(1);
  });

  it('should not update token price for rounds with existing tokenPrice', async () => {
    // Create a EarlyAccessRound with an existing token price
    const earlyAccessRound = EarlyAccessRound.create({
      roundNumber: Math.floor(Math.random() * 10000),
      startDate: moment().subtract(3, 'days').toDate(),
      endDate: moment().add(10, 'days').toDate(),
      tokenPrice: 50,
    });
    await EarlyAccessRound.save(earlyAccessRound);

    const updatedCount = await fillMissingTokenPriceInEarlyAccessRounds();

    const updatedEarlyAcccessRound = await EarlyAccessRound.findOne({
      where: { id: earlyAccessRound.id },
    });

    expect(updatedEarlyAcccessRound?.tokenPrice).to.equal(50);
    expect(updatedCount).to.equal(0);
  });

  it('should return zero if there are no rounds to update', async () => {
    // Ensure no rounds with null token_price
    await EarlyAccessRound.update({}, { tokenPrice: 100 });

    const updatedCount = await fillMissingTokenPriceInEarlyAccessRounds();

    expect(updatedCount).to.equal(0);
  });
});
