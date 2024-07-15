import { assert } from 'chai';
import moment from 'moment';
import axios from 'axios';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils.js';
import { Project } from '../entities/project.js';
import { QfRound } from '../entities/qfRound.js';
import { fillQfRoundHistory } from '../repositories/qfRoundHistoryRepository.js';
import { getQfRoundHistoryQuery } from '../../test/graphqlQueries.js';

describe('Fetch getQfRoundHistory test cases', getQfRoundHistoryTestCases);

function getQfRoundHistoryTestCases() {
  let qfRound: QfRound;
  let firstProject: Project;
  let secondProject: Project;
  beforeEach(async () => {
    qfRound = QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    firstProject = await saveProjectDirectlyToDb(createProjectData());
    secondProject = await saveProjectDirectlyToDb(createProjectData());

    firstProject.qfRounds = [qfRound];
    secondProject.qfRounds = [qfRound];

    await firstProject.save();
    await secondProject.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return qfRoundHistory correctly', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.passportScore = 12;
    await user.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 10,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user.id,
      firstProject.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 15,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user.id,
      firstProject.id,
    );
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();
    await fillQfRoundHistory();
    const result = await axios.post(graphqlUrl, {
      query: getQfRoundHistoryQuery,
      variables: {
        projectId: firstProject.id,
        qfRoundId: qfRound.id,
      },
    });
    const qfRoundHistory = result.data.data.getQfRoundHistory;
    assert.isOk(qfRoundHistory);
    assert.equal(qfRoundHistory.donationsCount, 2);
    assert.equal(qfRoundHistory.uniqueDonors, 1);
    assert.equal(qfRoundHistory.raisedFundInUsd, 25);
    assert.exists(qfRoundHistory.estimatedMatching);
    assert.equal(
      qfRoundHistory.estimatedMatching.matchingPool,
      qfRound.allocatedFund,
    );
  });
}
