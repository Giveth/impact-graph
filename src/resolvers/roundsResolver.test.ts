import { assert } from 'chai';
import moment from 'moment';
import axios from 'axios';
import { AppDataSource } from '../orm';
import { graphqlUrl } from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { generateRandomString } from '../utils/utils';
import {
  fetchAllRoundsQuery,
  fetchActiveRoundQuery,
} from '../../test/graphqlQueries';
import { Donation } from '../entities/donation';
import { QfRoundHistory } from '../entities/qfRoundHistory';

describe('Fetch all Rounds test cases', fetchAllRoundsTestCases);
describe('Fetch active Round test cases', fetchActiveRoundTestCases);

function fetchAllRoundsTestCases() {
  beforeEach(async () => {
    // Clean up data before each test case
    await Donation.createQueryBuilder()
      .delete()
      .where('qfRoundId IS NOT NULL')
      .execute();
    await AppDataSource.getDataSource()
      .createQueryBuilder()
      .delete()
      .from('project_qf_rounds_qf_round')
      .execute();
    await QfRoundHistory.delete({});
    await QfRound.delete({});
    await EarlyAccessRound.delete({});
  });

  after(async () => {
    // Clean up data after all test cases
    await Donation.createQueryBuilder()
      .delete()
      .where('qfRoundId IS NOT NULL')
      .execute();
    await AppDataSource.getDataSource()
      .createQueryBuilder()
      .delete()
      .from('project_qf_rounds_qf_round')
      .execute();
    await QfRoundHistory.delete({});
    await QfRound.delete({});
    await EarlyAccessRound.delete({});
  });

  it('should return all rounds (QF Rounds and Early Access Rounds)', async () => {
    // Create Early Access Rounds
    const earlyAccessRound1 = await EarlyAccessRound.create({
      roundNumber: 1,
      startDate: new Date(),
      endDate: moment().add(3, 'days').toDate(),
    }).save();

    const earlyAccessRound2 = await EarlyAccessRound.create({
      roundNumber: 2,
      startDate: moment().add(4, 'days').toDate(),
      endDate: moment().add(7, 'days').toDate(),
    }).save();

    // Create QF Rounds
    const qfRound1 = await QfRound.create({
      name: 'QF Round 1',
      slug: generateRandomString(10),
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();

    const qfRound2 = await QfRound.create({
      name: 'QF Round 2',
      slug: generateRandomString(10),
      allocatedFund: 200000,
      minimumPassportScore: 10,
      beginDate: moment().add(5, 'days').toDate(),
      endDate: moment().add(15, 'days').toDate(),
    }).save();

    // Query for all rounds
    const result = await axios.post(graphqlUrl, {
      query: fetchAllRoundsQuery,
    });

    const rounds = result.data.data.allRounds;
    assert.isArray(rounds);
    assert.lengthOf(rounds, 4); // 2 Early Access Rounds + 2 QF Rounds

    // Verify Early Access Rounds
    const earlyAccessRounds = rounds.filter(round => 'roundNumber' in round);
    assert.equal(
      earlyAccessRounds[0].roundNumber,
      earlyAccessRound1.roundNumber,
    );
    assert.equal(
      earlyAccessRounds[1].roundNumber,
      earlyAccessRound2.roundNumber,
    );

    // Verify QF Rounds
    const qfRounds = rounds.filter(round => 'name' in round);
    assert.equal(qfRounds[1].name, qfRound1.name);
    assert.equal(qfRounds[0].name, qfRound2.name);
  });
}

function fetchActiveRoundTestCases() {
  beforeEach(async () => {
    // Clean up data before each test case
    await Donation.createQueryBuilder()
      .delete()
      .where('qfRoundId IS NOT NULL')
      .execute();
    await AppDataSource.getDataSource()
      .createQueryBuilder()
      .delete()
      .from('project_qf_rounds_qf_round')
      .execute();
    await QfRoundHistory.delete({});
    await QfRound.delete({});
    await EarlyAccessRound.delete({});
  });

  after(async () => {
    // Clean up data after each test case
    await Donation.createQueryBuilder()
      .delete()
      .where('qfRoundId IS NOT NULL')
      .execute();
    await AppDataSource.getDataSource()
      .createQueryBuilder()
      .delete()
      .from('project_qf_rounds_qf_round')
      .execute();
    await QfRoundHistory.delete({});
    await await QfRound.delete({});
    await EarlyAccessRound.delete({});
  });

  it('should return the currently active Early Access round and no active QF round', async () => {
    // Create an active Early Access Round
    const activeEarlyAccessRound = await EarlyAccessRound.create({
      roundNumber: 1,
      startDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(2, 'days').toDate(),
    }).save();

    // Create a non-active QF round
    await QfRound.create({
      name: 'Inactive QF Round',
      slug: generateRandomString(10),
      allocatedFund: 50000,
      minimumPassportScore: 7,
      beginDate: moment().add(10, 'days').toDate(),
      endDate: moment().add(20, 'days').toDate(),
      isActive: false,
    }).save();

    // Query for the active round
    const result = await axios.post(graphqlUrl, {
      query: fetchActiveRoundQuery,
    });

    const response = result.data.data.activeRound;

    // Assert the active Early Access round is returned
    assert.isOk(response.activeRound);
    assert.equal(
      response.activeRound.roundNumber,
      activeEarlyAccessRound.roundNumber,
    );
  });

  it('should return the currently active QF round and no active Early Access round', async () => {
    // Create a non-active Early Access Round
    await EarlyAccessRound.create({
      roundNumber: 2,
      startDate: moment().add(10, 'days').toDate(),
      endDate: moment().add(20, 'days').toDate(),
    }).save();

    // Create an active QF round
    const activeQfRound = await QfRound.create({
      name: 'Active QF Round',
      slug: generateRandomString(10),
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(5, 'days').toDate(),
      isActive: true,
    }).save();

    // Query for the active round
    const result = await axios.post(graphqlUrl, {
      query: fetchActiveRoundQuery,
    });

    const response = result.data.data.activeRound;

    // Assert the active QF round is returned
    assert.isOk(response.activeRound);
    assert.equal(response.activeRound.name, activeQfRound.name);
  });

  it('should return null when there are no active rounds', async () => {
    // Create a non-active Early Access Round
    await EarlyAccessRound.create({
      roundNumber: 2,
      startDate: moment().add(10, 'days').toDate(),
      endDate: moment().add(20, 'days').toDate(),
    }).save();

    // Create a non-active QF round
    await QfRound.create({
      name: 'Inactive QF Round',
      slug: generateRandomString(10),
      allocatedFund: 50000,
      minimumPassportScore: 7,
      beginDate: moment().add(10, 'days').toDate(),
      endDate: moment().add(20, 'days').toDate(),
      isActive: false,
    }).save();

    // Query for the active round
    const result = await axios.post(graphqlUrl, {
      query: fetchActiveRoundQuery,
    });

    const response = result.data.data.activeRound;

    // Assert that no active round is returned
    assert.isNull(response.activeRound);
  });
}
