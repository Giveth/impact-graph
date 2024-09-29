import { expect } from 'chai';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import {
  findAllEarlyAccessRounds,
  findActiveEarlyAccessRound,
} from './earlyAccessRoundRepository';
import { saveEARoundDirectlyToDb } from '../../test/testUtils';

describe('EarlyAccessRound Repository Test Cases', () => {
  beforeEach(async () => {
    // Clean up data before each test case
    await EarlyAccessRound.delete({});
  });

  afterEach(async () => {
    // Clean up data after each test case
    await EarlyAccessRound.delete({});
  });

  it('should save a new Early Access Round directly to the database', async () => {
    const roundData = {
      roundNumber: 1,
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
      roundNumber: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
    });
    await saveEARoundDirectlyToDb({
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
});
