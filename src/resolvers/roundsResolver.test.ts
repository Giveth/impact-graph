import { assert } from 'chai';
import moment from 'moment';
import axios from 'axios';
import { AppDataSource } from '../orm';
import {
  generateEARoundNumber,
  generateQfRoundNumber,
  graphqlUrl,
} from '../../test/testUtils';
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
      roundNumber: generateEARoundNumber(),
      startDate: new Date(),
      endDate: moment().add(3, 'days').toDate(),
    }).save();

    const earlyAccessRound2 = await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
      startDate: moment().add(4, 'days').toDate(),
      endDate: moment().add(7, 'days').toDate(),
    }).save();

    // Create QF Rounds
    const qfRound1 = await QfRound.create({
      name: 'QF Round 1',
      slug: generateRandomString(10),
      roundNumber: generateQfRoundNumber(),
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
      roundUSDCapPerProject: 500000, // Nullable field
      roundUSDCapPerUserPerProject: 25000, // Nullable field
      tokenPrice: 0.12345678, // Nullable field
    }).save();

    const qfRound2 = await QfRound.create({
      name: 'QF Round 2',
      slug: generateRandomString(10),
      allocatedFund: 200000,
      minimumPassportScore: 10,
      beginDate: moment().add(5, 'days').toDate(),
      endDate: moment().add(15, 'days').toDate(),
      // Nullable fields left as null for this round
    }).save();

    // Query for all rounds
    const result = await axios.post(graphqlUrl, {
      query: fetchAllRoundsQuery,
    });

    const rounds = result.data.data.allRounds;
    assert.isArray(rounds);
    assert.lengthOf(rounds, 4); // 2 Early Access Rounds + 2 QF Rounds

    // Verify Early Access Rounds
    const earlyAccessRounds = rounds.filter(round => 'startDate' in round);
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

    // Verify nullable fields
    assert.equal(qfRounds[1].roundUSDCapPerProject, 500000);
    assert.equal(qfRounds[1].roundUSDCapPerUserPerProject, 25000);
    assert.equal(qfRounds[1].tokenPrice, 0.12345678);
    assert.isNull(qfRounds[0].roundUSDCapPerProject);
    assert.isNull(qfRounds[0].roundUSDCapPerUserPerProject);
    assert.isNull(qfRounds[0].tokenPrice);
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
    await QfRound.delete({});
    await EarlyAccessRound.delete({});
  });

  it('should return the currently active Early Access round and no active QF round', async () => {
    // Create an active Early Access Round
    const activeEarlyAccessRound = await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
      startDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(2, 'days').toDate(),
      roundUSDCapPerProject: 500000,
      roundUSDCapPerUserPerProject: 25000,
      tokenPrice: 0.12345678,
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
      roundUSDCapPerProject: 100000,
      roundUSDCapPerUserPerProject: 5000,
      tokenPrice: 0.54321,
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
    assert.equal(response.activeRound.roundUSDCapPerProject, 500000);
    assert.equal(response.activeRound.roundUSDCapPerUserPerProject, 25000);
    assert.equal(response.activeRound.tokenPrice, 0.12345678);
  });

  it('should return the currently active QF round and no active Early Access round', async () => {
    // Create a non-active Early Access Round
    await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
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
      roundUSDCapPerProject: 500000,
      roundUSDCapPerUserPerProject: 25000,
      tokenPrice: 0.12345678,
    }).save();

    // Query for the active round
    const result = await axios.post(graphqlUrl, {
      query: fetchActiveRoundQuery,
    });

    const response = result.data.data.activeRound;

    // Assert the active QF round is returned
    assert.isOk(response.activeRound);
    assert.equal(response.activeRound.name, activeQfRound.name);
    assert.equal(response.activeRound.roundUSDCapPerProject, 500000);
    assert.equal(response.activeRound.roundUSDCapPerUserPerProject, 25000);
    assert.equal(response.activeRound.tokenPrice, 0.12345678);
  });

  it('should return null when there are no active rounds', async () => {
    // Create a non-active Early Access Round
    await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
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
      // Nullable fields left as null
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
