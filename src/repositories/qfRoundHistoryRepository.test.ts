import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { assert, expect } from 'chai';
import {
  getProjectDonationsSqrtRootSum,
  getQfRoundTotalProjectsDonationsSum,
} from './qfRoundRepository';
import { Project } from '../entities/project';
import moment from 'moment';
import {
  refreshProjectDonationSummaryView,
  refreshProjectEstimatedMatchingView,
} from '../services/projectViewsService';
import {
  fillQfRoundHistory,
  getQfRoundHistory,
} from './qfRoundHistoryRepository';

describe('fillQfRoundHistory test cases', fillQfRoundHistoryTestCases);

// TODO need to have more test cases for this conditions:
// when there is no donation for a project
// when there is no donation for a qfRound
// when there is some donation for a project and qfRound and some not
function fillQfRoundHistoryTestCases() {
  let qfRound: QfRound;
  let firstProject: Project;
  let secondProject: Project;
  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
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

  it('should return correct value for single project', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
          }),
        );
      }),
    );

    // if want to fill history round end date should be passed and be inactive
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });

    expect(foundQfRoundHistory!.uniqueDonors).to.equal(3);
    expect(foundQfRoundHistory!.raisedFundInUsd).to.equal(129);
  });
  it('should return correct value for two project', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(async valueUsd => {
            await saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
            await saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              secondProject.id,
            );
          }),
        );
      }),
    );

    // if want to fill history round end date should be passed and be inactive
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistoryForFirstProject = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    const foundQfRoundHistoryForSecondProject = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });

    expect(foundQfRoundHistoryForFirstProject!.uniqueDonors).to.equal(3);
    expect(foundQfRoundHistoryForFirstProject!.raisedFundInUsd).to.equal(129);

    expect(foundQfRoundHistoryForSecondProject!.uniqueDonors).to.equal(3);
    expect(foundQfRoundHistoryForSecondProject!.raisedFundInUsd).to.equal(129);
  });
  it('should not fill qfRoundHistory for non active qfRounds', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
          }),
        );
      }),
    );

    qfRound.endDate = moment().subtract(1, 'days').toDate();
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isNull(foundQfRoundHistory);
  });
  it('should not fill qfRoundHistory for rounds that their endDate hasn passed', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
          }),
        );
      }),
    );

    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isNull(foundQfRoundHistory);
  });
  it('should not count donations from users that their passportScore is lower than qfRound.minimumPassportScore', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user1.passportScore = 6;
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user2.passportScore = 12;
    await user2.save();
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 10,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user1.id,
      firstProject.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 15,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user2.id,
      firstProject.id,
    );
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isOk(foundQfRoundHistory);
    assert.equal(foundQfRoundHistory?.uniqueDonors, 1);
    assert.equal(foundQfRoundHistory?.raisedFundInUsd, 15);
  });
  it('should not count unverified donations', async () => {
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
        status: 'pending',
      },
      user.id,
      firstProject.id,
    );
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isOk(foundQfRoundHistory);
    assert.equal(foundQfRoundHistory?.uniqueDonors, 1);
    assert.equal(foundQfRoundHistory?.raisedFundInUsd, 10);
  });
}
