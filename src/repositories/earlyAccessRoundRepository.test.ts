import { expect } from 'chai';
import sinon from 'sinon';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import {
  findAllEarlyAccessRounds,
  findActiveEarlyAccessRound,
} from './earlyAccessRoundRepository';
import {
  generateEARoundNumber,
  saveEARoundDirectlyToDb,
} from '../../test/testUtils';
import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';

describe('EarlyAccessRound Repository Test Cases', () => {
  let priceAdapterStub: sinon.SinonStub;

  beforeEach(async () => {
    // Clean up data before each test case
    await EarlyAccessRound.delete({});

    // Stub CoingeckoPriceAdapter to mock getTokenPriceAtDate
    priceAdapterStub = sinon
      .stub(CoingeckoPriceAdapter.prototype, 'getTokenPriceAtDate')
      .resolves(100);
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
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
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
    expect(savedRound.roundPOLCapPerProject).to.equal(
      roundData.roundPOLCapPerProject,
    );
    expect(savedRound.roundPOLCapPerUserPerProject).to.equal(
      roundData.roundPOLCapPerUserPerProject,
    );
  });

  it('should find all Early Access Rounds', async () => {
    // Save a couple of rounds first
    await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
    });
    await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-06'),
      endDate: new Date('2024-09-10'),
      roundPOLCapPerProject: 2000000,
      roundPOLCapPerUserPerProject: 100000,
    });

    const rounds = await findAllEarlyAccessRounds();

    expect(rounds).to.be.an('array');
    expect(rounds.length).to.equal(2);
    expect(rounds[0]).to.be.an.instanceof(EarlyAccessRound);
    expect(rounds[0].roundPOLCapPerProject).to.equal(1000000);
    expect(rounds[1].roundPOLCapPerUserPerProject).to.equal(100000);
  });

  it('should find the active Early Access Round', async () => {
    const activeRoundData = {
      roundNumber: generateEARoundNumber(),
      startDate: new Date(new Date().setDate(new Date().getDate() - 1)), // yesterday
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // tomorrow
      roundPOLCapPerProject: 500000,
      roundPOLCapPerUserPerProject: 25000,
    };

    const inactiveRoundData = {
      roundNumber: generateEARoundNumber(),
      startDate: new Date(new Date().getDate() + 1),
      endDate: new Date(new Date().getDate() + 2),
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
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
    expect(activeRound?.roundPOLCapPerProject).to.equal(
      activeRoundData.roundPOLCapPerProject,
    );
    expect(activeRound?.roundPOLCapPerUserPerProject).to.equal(
      activeRoundData.roundPOLCapPerUserPerProject,
    );
  });

  it('should return null when no active Early Access Round is found', async () => {
    const activeRound = await findActiveEarlyAccessRound();
    expect(activeRound).to.be.null;
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
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
    };

    const savedRound = await saveEARoundDirectlyToDb(roundData);

    const updatedEarlyAccessRound = await EarlyAccessRound.findOne({
      where: { id: savedRound.id },
    });

    expect(updatedEarlyAccessRound?.cumulativePOLCapPerProject).to.equal(
      1000000,
    );
    expect(updatedEarlyAccessRound?.cumulativePOLCapPerUserPerProject).to.equal(
      50000,
    );
  });

  it('should calculate cumulative cap across multiple rounds', async () => {
    // Save multiple rounds
    await saveEARoundDirectlyToDb({
      roundNumber: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
    });
    await saveEARoundDirectlyToDb({
      roundNumber: 2,
      startDate: new Date('2024-09-06'),
      endDate: new Date('2024-09-10'),
      roundPOLCapPerProject: 2000000,
      roundPOLCapPerUserPerProject: 100000,
    });
    const latestRound = await saveEARoundDirectlyToDb({
      roundNumber: 3,
      startDate: new Date('2024-09-11'),
      endDate: new Date('2024-09-15'),
      roundPOLCapPerProject: 1500000,
      roundPOLCapPerUserPerProject: 75000,
    });

    const updatedEarlyAccessRound = await EarlyAccessRound.findOne({
      where: { id: latestRound.id },
    });

    // The cumulative cap should be the sum of caps from all previous rounds
    expect(updatedEarlyAccessRound?.cumulativePOLCapPerProject).to.equal(
      4500000,
    ); // 1000000 + 2000000 + 1500000
    expect(updatedEarlyAccessRound?.cumulativePOLCapPerUserPerProject).to.equal(
      225000,
    ); // 50000 + 100000 + 75000
  });

  it('should handle rounds with missing caps by skipping them in the cumulative sum', async () => {
    // Save multiple rounds where one round is missing caps
    await saveEARoundDirectlyToDb({
      roundNumber: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
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
      roundPOLCapPerProject: 1500000,
      roundPOLCapPerUserPerProject: 75000,
    });

    const updatedEarlyAccessRound = await EarlyAccessRound.findOne({
      where: { id: latestRound.id },
    });

    // The cumulative cap should skip round 2 and only sum rounds 1 and 3
    expect(updatedEarlyAccessRound?.cumulativePOLCapPerProject).to.equal(
      2500000,
    ); // 1000000 + 1500000
    expect(updatedEarlyAccessRound?.cumulativePOLCapPerUserPerProject).to.equal(
      125000,
    ); // 50000 + 75000
  });
});
