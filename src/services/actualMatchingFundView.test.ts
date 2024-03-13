import { QfRound } from '../entities/qfRound';
import { Project } from '../entities/project';
import moment from 'moment';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { getProjectDonationsSqrtRootSum } from '../repositories/qfRoundRepository';
import { assert, expect } from 'chai';
import {
  refreshProjectActualMatchingView,
  refreshProjectDonationSummaryView,
  refreshProjectEstimatedMatchingView,
} from './projectViewsService';
import { ProjectActualMatchingView } from '../entities/ProjectActualMatchingView';
import { NETWORK_IDS } from '../provider';

describe('getActualMatchingFund test cases', getActualMatchingFundTests);

function getActualMatchingFundTests() {
  let qfRound: QfRound;
  let project: Project;

  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      minimumValidUsdValue: 1,
      slug: new Date().getTime().toString(),
      eligibleNetworks: [
        NETWORK_IDS.XDAI,
        NETWORK_IDS.OPTIMISTIC,
        NETWORK_IDS.POLYGON,
        NETWORK_IDS.MAIN_NET,
      ],
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    project = await saveProjectDirectlyToDb(createProjectData());
    project.qfRounds = [qfRound];
    await project.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should not return null when there is no donation', async () => {
    await refreshProjectActualMatchingView();
    const actualMatchingFund = await ProjectActualMatchingView.findOne({
      where: {
        projectId: project.id,
        qfRoundId: qfRound.id,
      },
    });
    assert.isNotNull(actualMatchingFund);
    assert.equal(actualMatchingFund?.projectId, project.id);
  });

  it('should return correct value on single donation', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.passportScore = 10;
    await user.save();
    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: 100,
        qfRoundId: qfRound.id,
        qfRoundUserScore: user.passportScore,
      },
      user.id,
      project.id,
    );
    await refreshProjectActualMatchingView();

    const actualMatchingFund = await ProjectActualMatchingView.findOne({
      where: {
        projectId: project.id,
        qfRoundId: qfRound.id,
      },
    });

    // tslint:disable-next-line:no-console
    console.log(
      'actualMatchingView** single',
      await ProjectActualMatchingView.findOne({
        where: {
          projectId: project.id,
          qfRoundId: qfRound.id,
        },
      }),
    );
    assert.equal(actualMatchingFund?.projectId, project.id);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 1);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis[0], donation.id);
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 1);
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis[0], donation.id);
    assert.equal(actualMatchingFund?.allUsdReceived, donation.valueUsd);
    assert.equal(actualMatchingFund?.uniqueQualifiedDonors, 1);
    assert.equal(actualMatchingFund?.totalDonors, 1);
    assert.equal(
      actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis,
      donation.valueUsd,
    );

    // qfRound has 4 networks so we just recipient addresses for those networks
    assert.equal(actualMatchingFund?.networkAddresses?.split(',').length, 4);
  });

  it('should return correct value on multiple donations', async () => {
    const valuesUsd = [4, 25, 100, 1024];
    await Promise.all(
      valuesUsd.map(async (valueUsd, index) => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return saveDonationDirectlyToDb(
          {
            ...createDonationData(),
            valueUsd,
            qfRoundId: qfRound.id,
            qfRoundUserScore: user.passportScore,
            status: 'verified',
          },
          user.id,
          project.id,
        );
      }),
    );
    await refreshProjectActualMatchingView();

    const actualMatchingFund = await ProjectActualMatchingView.findOne({
      where: {
        projectId: project.id,
        qfRoundId: qfRound.id,
      },
    });

    // tslint:disable-next-line:no-console
    console.log(
      'actualMatchingView**',
      await ProjectActualMatchingView.findOne({
        where: {
          projectId: project.id,
          qfRoundId: qfRound.id,
        },
      }),
    );
    assert.equal(actualMatchingFund?.projectId, project.id);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 4);
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 4);
    assert.equal(actualMatchingFund?.allUsdReceived, 4 + 25 + 100 + 1024);
    assert.equal(
      actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis,
      4 + 25 + 100 + 1024,
    );
    assert.equal(actualMatchingFund?.uniqueQualifiedDonors, 4);
    assert.equal(actualMatchingFund?.totalDonors, 4);

    // qfRound has 4 networks so we just recipient addresses for those networks
    assert.equal(actualMatchingFund?.networkAddresses?.split(',').length, 4);
  });

  it('should return correct value on multiple donations with same user', async () => {
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
                qfRoundUserScore: user.passportScore,
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              project.id,
            );
          }),
        );
      }),
    );

    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();

    await refreshProjectActualMatchingView();

    const actualMatchingFund = await ProjectActualMatchingView.findOne({
      where: {
        projectId: project.id,
        qfRoundId: qfRound.id,
      },
    });

    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) = 2 + 5 + 10 = 17
    const expectedSum = 17;
    assert.equal(actualMatchingFund?.donationsSqrtRootSum, expectedSum);
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 6);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 6);
  });

  it('should ignore donations less than 1$', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
      [0.5], //  should be ignored
      [0.7], // should be ignored
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
                qfRoundUserScore: user.passportScore,
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              project.id,
            );
          }),
        );
      }),
    );

    await refreshProjectActualMatchingView();

    const actualMatchingFund = await ProjectActualMatchingView.findOne({
      where: {
        projectId: project.id,
        qfRoundId: qfRound.id,
      },
    });

    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) = 2 + 5 + 10 = 17
    const expectedSum = 17;
    assert.equal(actualMatchingFund?.donationsSqrtRootSum, expectedSum);
    assert.equal(
      actualMatchingFund?.allUsdReceived,
      1 + 3 + 2 + 23 + 3 + 97 + 0.5 + 0.7,
    );
    assert.equal(
      actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis,
      1 + 3 + 2 + 23 + 3 + 97,
    );
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 6);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 8);
  });
  it('should not ignore donations less than 1$ if multiple donations of user has more than 1$ value', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
      [0.5], //  should be ignored
      [0.7], // should be ignored
      [0.5, 0.5], // 1 should be included
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
                qfRoundUserScore: user.passportScore,
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              project.id,
            );
          }),
        );
      }),
    );

    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();

    await refreshProjectActualMatchingView();

    const actualMatchingFund = await ProjectActualMatchingView.findOne({
      where: {
        projectId: project.id,
        qfRoundId: qfRound.id,
      },
    });

    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) + sqrt(1) = 2 + 5 + 10 + 1 = 18
    const expectedSum = 18;
    assert.equal(actualMatchingFund?.donationsSqrtRootSum, expectedSum);
    assert.equal(
      actualMatchingFund?.allUsdReceived,
      1 + 3 + 2 + 23 + 3 + 97 + 0.5 + 0.7 + 0.5 + 0.5,
    );
    assert.equal(
      actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis,
      1 + 3 + 2 + 23 + 3 + 97 + 0.5 + 0.5,
    );
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 8);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 10);
  });
}
