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
import {
  QACC_DONATION_TOKEN_COINGECKO_ID,
  QACC_PRICE_FETCH_LEAD_TIME_IN_SECONDS,
} from '../constants/qacc';

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
      roundUSDCapPerProject: 1000000,
      roundUSDCapPerUserPerProject: 50000,
      tokenPrice: 0.12345678,
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
    expect(savedRound.roundUSDCapPerProject).to.equal(
      roundData.roundUSDCapPerProject,
    );
    expect(savedRound.roundUSDCapPerUserPerProject).to.equal(
      roundData.roundUSDCapPerUserPerProject,
    );
    expect(savedRound.tokenPrice).to.equal(roundData.tokenPrice);
  });

  it('should find all Early Access Rounds', async () => {
    // Save a couple of rounds first
    await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      roundUSDCapPerProject: 1000000,
      roundUSDCapPerUserPerProject: 50000,
      tokenPrice: 0.12345678,
    });
    await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-06'),
      endDate: new Date('2024-09-10'),
      roundUSDCapPerProject: 2000000,
      roundUSDCapPerUserPerProject: 100000,
      tokenPrice: 0.23456789,
    });

    const rounds = await findAllEarlyAccessRounds();

    expect(rounds).to.be.an('array');
    expect(rounds.length).to.equal(2);
    expect(rounds[0]).to.be.an.instanceof(EarlyAccessRound);
    expect(rounds[0].roundUSDCapPerProject).to.equal(1000000);
    expect(rounds[1].roundUSDCapPerUserPerProject).to.equal(100000);
    expect(rounds[0].tokenPrice).to.equal(0.12345678);
  });

  it('should find the active Early Access Round', async () => {
    const activeRoundData = {
      roundNumber: generateEARoundNumber(),
      startDate: new Date(new Date().setDate(new Date().getDate() - 1)), // yesterday
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // tomorrow
      roundUSDCapPerProject: 500000,
      roundUSDCapPerUserPerProject: 25000,
      tokenPrice: 0.11111111,
    };

    const inactiveRoundData = {
      roundNumber: generateEARoundNumber(),
      startDate: new Date(new Date().getDate() + 1),
      endDate: new Date(new Date().getDate() + 2),
      roundUSDCapPerProject: 1000000,
      roundUSDCapPerUserPerProject: 50000,
      tokenPrice: 0.22222222,
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
    expect(activeRound?.roundUSDCapPerProject).to.equal(
      activeRoundData.roundUSDCapPerProject,
    );
    expect(activeRound?.roundUSDCapPerUserPerProject).to.equal(
      activeRoundData.roundUSDCapPerUserPerProject,
    );
    expect(activeRound?.tokenPrice).to.equal(activeRoundData.tokenPrice);
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
      date: moment(earlyAccessRound.startDate)
        .subtract(QACC_PRICE_FETCH_LEAD_TIME_IN_SECONDS, 'second')
        .toDate(),
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

    sinon.assert.notCalled(priceAdapterStub);

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

describe('EarlyAccessRound Cumulative Cap Test Cases', () => {
  beforeEach(async () => {
    // Clean up data before each test case
    await EarlyAccessRound.delete({});
  });

  afterEach(async () => {
    // Clean up data after each test case
    await EarlyAccessRound.delete({});
  });

  it('should return the cap itself as the cumulative cap for the first round', async () => {
    const roundData = {
      roundNumber: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      roundUSDCapPerProject: 1000000,
      roundUSDCapPerUserPerProject: 50000,
    };

    const savedRound = await saveEARoundDirectlyToDb(roundData);

    const updatedEarlyAccessRound = await EarlyAccessRound.findOne({
      where: { id: savedRound.id },
    });

    expect(updatedEarlyAccessRound?.cumulativeCapPerProject).to.equal(1000000);
    expect(updatedEarlyAccessRound?.cumulativeCapPerUserPerProject).to.equal(
      50000,
    );
  });

  it('should calculate cumulative cap across multiple rounds', async () => {
    // Save multiple rounds
    await saveEARoundDirectlyToDb({
      roundNumber: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      roundUSDCapPerProject: 1000000,
      roundUSDCapPerUserPerProject: 50000,
    });
    await saveEARoundDirectlyToDb({
      roundNumber: 2,
      startDate: new Date('2024-09-06'),
      endDate: new Date('2024-09-10'),
      roundUSDCapPerProject: 2000000,
      roundUSDCapPerUserPerProject: 100000,
    });
    const latestRound = await saveEARoundDirectlyToDb({
      roundNumber: 3,
      startDate: new Date('2024-09-11'),
      endDate: new Date('2024-09-15'),
      roundUSDCapPerProject: 1500000,
      roundUSDCapPerUserPerProject: 75000,
    });

    const updatedEarlyAccessRound = await EarlyAccessRound.findOne({
      where: { id: latestRound.id },
    });

    // The cumulative cap should be the sum of caps from all previous rounds
    expect(updatedEarlyAccessRound?.cumulativeCapPerProject).to.equal(4500000); // 1000000 + 2000000 + 1500000
    expect(updatedEarlyAccessRound?.cumulativeCapPerUserPerProject).to.equal(
      225000,
    ); // 50000 + 100000 + 75000
  });

  it('should handle rounds with missing caps by skipping them in the cumulative sum', async () => {
    // Save multiple rounds where one round is missing caps
    await saveEARoundDirectlyToDb({
      roundNumber: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      roundUSDCapPerProject: 1000000,
      roundUSDCapPerUserPerProject: 50000,
    });
    await saveEARoundDirectlyToDb({
      roundNumber: 2,
      startDate: new Date('2024-09-06'),
      endDate: new Date('2024-09-10'),
      // missing caps
    });
    const latestRound = await saveEARoundDirectlyToDb({
      roundNumber: 3,
      startDate: new Date('2024-09-11'),
      endDate: new Date('2024-09-15'),
      roundUSDCapPerProject: 1500000,
      roundUSDCapPerUserPerProject: 75000,
    });

    const updatedEarlyAccessRound = await EarlyAccessRound.findOne({
      where: { id: latestRound.id },
    });

    // The cumulative cap should skip round 2 and only sum rounds 1 and 3
    expect(updatedEarlyAccessRound?.cumulativeCapPerProject).to.equal(2500000); // 1000000 + 1500000
    expect(updatedEarlyAccessRound?.cumulativeCapPerUserPerProject).to.equal(
      125000,
    ); // 50000 + 75000
  });
});
