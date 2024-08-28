import { assert } from 'chai';
import axios from 'axios';
import moment from 'moment';
import { saveRoundDirectlyToDb, graphqlUrl } from '../../test/testUtils';
import {
  fetchAllEarlyAccessRoundsQuery,
  fetchActiveEarlyAccessRoundQuery,
} from '../../test/graphqlQueries';
import { EarlyAccessRound } from '../entities/earlyAccessRound';

describe(
  'Fetch all Early Access Rounds test cases',
  fetchAllEarlyAccessRoundsTestCases,
);
describe(
  'Fetch active Early Access Round test cases',
  fetchActiveEarlyAccessRoundTestCases,
);

function fetchAllEarlyAccessRoundsTestCases() {
  beforeEach(async () => {
    // Clean up data before each test case
    await EarlyAccessRound.delete({});
  });

  afterEach(async () => {
    // Clean up data after each test case
    await EarlyAccessRound.delete({});
  });

  it('should return all early access rounds', async () => {
    // Create some rounds with specific dates
    const round1 = await saveRoundDirectlyToDb({
      roundNumber: 1,
      startDate: new Date(),
      endDate: moment().add(3, 'days').toDate(),
    });

    const round2 = await saveRoundDirectlyToDb({
      roundNumber: 2,
      startDate: moment().add(4, 'days').toDate(),
      endDate: moment().add(7, 'days').toDate(),
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchAllEarlyAccessRoundsQuery,
    });

    const rounds = result.data.data.allEarlyAccessRounds;
    assert.isArray(rounds);
    assert.lengthOf(rounds, 2);
    assert.equal(rounds[0].roundNumber, round1.roundNumber);
    assert.equal(rounds[1].roundNumber, round2.roundNumber);
  });
}

function fetchActiveEarlyAccessRoundTestCases() {
  beforeEach(async () => {
    // Clean up data before each test case
    await EarlyAccessRound.delete({});
  });

  afterEach(async () => {
    // Clean up data after each test case
    await EarlyAccessRound.delete({});
  });

  it('should return the currently active early access round', async () => {
    // Create an active round
    const activeRound = await saveRoundDirectlyToDb({
      roundNumber: 1,
      startDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(2, 'days').toDate(),
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchActiveEarlyAccessRoundQuery,
    });

    const round = result.data.data.activeEarlyAccessRound;
    assert.isOk(round);
    assert.equal(round.roundNumber, activeRound.roundNumber);
    assert.isTrue(new Date(round.startDate) < new Date());
    assert.isTrue(new Date(round.endDate) > new Date());
  });

  it('should return null if there is no active early access round', async () => {
    // Create a round that is not active
    await saveRoundDirectlyToDb({
      roundNumber: 2,
      startDate: moment().add(10, 'days').toDate(),
      endDate: moment().add(20, 'days').toDate(),
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchActiveEarlyAccessRoundQuery,
    });

    const round = result.data.data.activeEarlyAccessRound;
    assert.isNull(round);
  });
}
