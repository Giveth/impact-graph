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
      'actualMatchingView**',
      await ProjectActualMatchingView.findOne({
        where: {
          projectId: project.id,
          qfRoundId: qfRound.id,
        },
      }),
    );
    // tslint:disable-next-line:no-console
    console.log('donation***', donation);
    assert.equal(actualMatchingFund?.projectId, project.id);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 1);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis[0], donation.id);
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 1);
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis[0], donation.id);
    assert.equal(actualMatchingFund?.allUsdReceived, donation.valueUsd);
    assert.equal(
      actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis,
      donation.valueUsd,
    );
  });

  it.skip('should return correct value on multiple donations', async () => {
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
            status: 'verified',
          },
          user.id,
          project.id,
        );
      }),
    );
    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();

    const { sqrtRootSum, uniqueDonorsCount } =
      await getProjectDonationsSqrtRootSum(project.id, qfRound.id);
    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) + sqrt(1024) = 2 + 5 + 10 + 32 = 49
    const expectedSum = 49;

    expect(sqrtRootSum).to.equal(expectedSum);
    expect(uniqueDonorsCount).to.equal(4);
  });

  it.skip('should return correct value on multiple donations with same user', async () => {
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
              project.id,
            );
          }),
        );
      }),
    );

    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();

    const { sqrtRootSum, uniqueDonorsCount } =
      await getProjectDonationsSqrtRootSum(project.id, qfRound.id);
    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) = 2 + 5 + 10 = 17
    const expectedSum = 17;

    expect(sqrtRootSum).to.equal(expectedSum);
    expect(uniqueDonorsCount).to.equal(3);
  });
}
