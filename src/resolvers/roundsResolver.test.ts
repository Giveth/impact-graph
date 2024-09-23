import { assert } from 'chai';
import moment from 'moment';
import axios from 'axios';
import { graphqlUrl } from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { generateRandomString } from '../utils/utils';
import {
  fetchAllRoundsQuery,
  fetchActiveRoundsQuery,
} from '../../test/graphqlQueries';

describe('Fetch all Rounds test cases', fetchAllRoundsTestCases);
describe('Fetch active Rounds test cases', fetchActiveRoundsTestCases);

function fetchAllRoundsTestCases() {
  beforeEach(async () => {
    // Clean up data before each test case
    await QfRound.delete({});
    await EarlyAccessRound.delete({});
  });

  afterAll(async () => {
    // Clean up data after each test case
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
    assert.isArray(rounds.earlyAccessRounds);
    assert.isArray(rounds.qfRounds);
    assert.lengthOf(rounds.earlyAccessRounds, 2);
    assert.lengthOf(rounds.qfRounds, 2);

    // Verify Early Access Rounds
    assert.equal(
      rounds.earlyAccessRounds[0].roundNumber,
      earlyAccessRound1.roundNumber,
    );
    assert.equal(
      rounds.earlyAccessRounds[1].roundNumber,
      earlyAccessRound2.roundNumber,
    );

    // Verify QF Rounds
    assert.equal(rounds.qfRounds[1].name, qfRound1.name);
    assert.equal(rounds.qfRounds[0].name, qfRound2.name);
  });
}

function fetchActiveRoundsTestCases() {
  beforeEach(async () => {
    // Clean up data before each test case
    await QfRound.delete({});
    await EarlyAccessRound.delete({});
  });

  afterEach(async () => {
    // Clean up data after each test case
    await QfRound.delete({});
    await EarlyAccessRound.delete({});
  });

  it('should return the currently active rounds (QF and Early Access)', async () => {
    // Create an active early access round
    const activeEarlyAccessRound = await EarlyAccessRound.create({
      roundNumber: 1,
      startDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(2, 'days').toDate(),
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

    // Query for the active rounds
    const result = await axios.post(graphqlUrl, {
      query: fetchActiveRoundsQuery,
    });

    const activeRounds = result.data.data.activeRounds;
    assert.isOk(activeRounds);

    // Verify Active Early Access Round
    assert.isOk(activeRounds.activeEarlyAccessRound);
    assert.equal(
      activeRounds.activeEarlyAccessRound.roundNumber,
      activeEarlyAccessRound.roundNumber,
    );
    assert.isTrue(
      new Date(activeRounds.activeEarlyAccessRound.startDate) < new Date(),
    );
    assert.isTrue(
      new Date(activeRounds.activeEarlyAccessRound.endDate) > new Date(),
    );

    // Verify Active QF Round
    assert.isOk(activeRounds.activeQfRound);
    assert.equal(activeRounds.activeQfRound.name, activeQfRound.name);
    assert.isTrue(new Date(activeRounds.activeQfRound.beginDate) < new Date());
    assert.isTrue(new Date(activeRounds.activeQfRound.endDate) > new Date());
  });

  it('should return null if there are no active rounds', async () => {
    // Create non-active Early Access Round
    await EarlyAccessRound.create({
      roundNumber: 2,
      startDate: moment().add(10, 'days').toDate(),
      endDate: moment().add(20, 'days').toDate(),
    }).save();

    // Create non-active QF Round
    await QfRound.create({
      name: 'Inactive QF Round',
      slug: generateRandomString(10),
      allocatedFund: 50000,
      minimumPassportScore: 7,
      beginDate: moment().add(10, 'days').toDate(),
      endDate: moment().add(20, 'days').toDate(),
      isActive: false,
    }).save();

    // Query for the active rounds
    const result = await axios.post(graphqlUrl, {
      query: fetchActiveRoundsQuery,
    });

    const activeRounds = result.data.data.activeRounds;
    assert.isNull(activeRounds.activeEarlyAccessRound);
    assert.isNull(activeRounds.activeQfRound);
  });
}
