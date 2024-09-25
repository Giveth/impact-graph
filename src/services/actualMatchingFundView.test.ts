import moment from 'moment';
import { assert } from 'chai';
import { QfRound } from '../entities/qfRound';
import { Project } from '../entities/project';
import {
  createDonationData,
  createProjectData,
  generateQfRoundNumber,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  refreshProjectActualMatchingView,
  refreshProjectEstimatedMatchingView,
} from './projectViewsService';
import { ProjectActualMatchingView } from '../entities/ProjectActualMatchingView';
import { NETWORK_IDS } from '../provider';
import { Sybil } from '../entities/sybil';
import { ProjectFraud } from '../entities/projectFraud';
import { DONATION_STATUS } from '../entities/donation';

describe('getActualMatchingFund test cases', getActualMatchingFundTests);

function getActualMatchingFundTests() {
  let qfRound: QfRound;
  let project: Project;

  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      roundNumber: generateQfRoundNumber(),
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

  it('Ensures the view is not null for projects with no donations', async () => {
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
  it('Verifies accurate calculations for a project with a single donation', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.passportScore = qfRound.minimumPassportScore;
    await user.save();
    await saveDonationDirectlyToDb(
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

    assert.isNotNull(actualMatchingFund);
    assert.equal(actualMatchingFund?.projectId, project.id);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 1);
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 1);
    assert.equal(actualMatchingFund?.allUsdReceived, 100);
    assert.equal(actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis, 100);

    // qfRound has 4 networks so we just recipient addresses for those networks
    assert.equal(actualMatchingFund?.networkAddresses?.split(',').length, 4);
  });
  it('Confirms donations from recipients of verified projects are excluded', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.passportScore = qfRound.minimumPassportScore;
    await user.save();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: user.walletAddress as string,
      listed: true,
      verified: true,
    });
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
    assert.equal(actualMatchingFund?.projectId, project.id);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 1);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis[0], donation.id);
    assert.isNotOk(actualMatchingFund?.donationIdsAfterAnalysis);
    assert.equal(actualMatchingFund?.allUsdReceived, donation.valueUsd);
    assert.equal(actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis, 0);
    assert.equal(actualMatchingFund?.uniqueQualifiedDonors, 0);
    assert.equal(actualMatchingFund?.totalDonors, 1);

    // qfRound has 4 networks so we just recipient addresses for those networks
    assert.equal(actualMatchingFund?.networkAddresses?.split(',').length, 4);
  });
  it('Validates correct aggregation of multiple donations to a project', async () => {
    const valuesUsd = [4, 25, 100, 1024];
    await Promise.all(
      valuesUsd.map(async valueUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = qfRound.minimumPassportScore;
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
  it('Ensures accurate calculation when a single user makes multiple donations', async () => {
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
        user.passportScore = qfRound.minimumPassportScore;
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
  it('Confirms donations under $1 are correctly ignored in calculations', async () => {
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
        user.passportScore = qfRound.minimumPassportScore;
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
  it('Verifies aggregated donations from a user exceeding $1 are included', async () => {
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
        user.passportScore = qfRound.minimumPassportScore;
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
  it('Asserts that donations to non-verified projects are properly included', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    project.verified = false;
    await project.save();
    user.passportScore = qfRound.minimumPassportScore;
    await user.save();
    await saveDonationDirectlyToDb(
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

    assert.isNotNull(actualMatchingFund);
    assert.equal(actualMatchingFund?.projectId, project.id);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 1);
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 1);
    assert.equal(actualMatchingFund?.allUsdReceived, 100);
    assert.equal(actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis, 100);

    // qfRound has 4 networks so we just recipient addresses for those networks
    assert.equal(actualMatchingFund?.networkAddresses?.split(',').length, 4);
  });
  it('Checks that donations to unlisted projects are included in the analysis', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    project.listed = false;
    await project.save();
    user.passportScore = qfRound.minimumPassportScore;
    await user.save();
    await saveDonationDirectlyToDb(
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

    assert.isNotNull(actualMatchingFund);
    assert.equal(actualMatchingFund?.projectId, project.id);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 1);
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 1);
    assert.equal(actualMatchingFund?.allUsdReceived, 100);
    assert.equal(actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis, 100);

    // qfRound has 4 networks so we just recipient addresses for those networks
    assert.equal(actualMatchingFund?.networkAddresses?.split(',').length, 4);
  });
  it('Ensures donations from identified Sybil users are excluded', async () => {
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
        user.passportScore = qfRound.minimumPassportScore;
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

    const sybilUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    sybilUser.passportScore = 10;
    await sybilUser.save();
    const sybil = new Sybil();
    sybil.userId = sybilUser.id;
    sybil.qfRoundId = qfRound.id;
    sybil.walletAddress = sybilUser.walletAddress as string;
    await sybil.save();
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        qfRoundUserScore: sybilUser.passportScore,
        valueUsd: 35,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      sybilUser.id,
      project.id,
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
      1 + 3 + 2 + 23 + 3 + 97 + 35,
    );
    assert.equal(
      actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis,
      1 + 3 + 2 + 23 + 3 + 97,
    );
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 6);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 7);
  });
  it('Validates that donations from users with insufficient passport scores are excluded', async () => {
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
        user.passportScore = qfRound.minimumPassportScore;
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

    const userWithLowPassportScore = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    userWithLowPassportScore.passportScore = qfRound.minimumPassportScore - 1;
    await userWithLowPassportScore.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        qfRoundUserScore: userWithLowPassportScore.passportScore,
        valueUsd: 35,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      userWithLowPassportScore.id,
      project.id,
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
      1 + 3 + 2 + 23 + 3 + 97 + 35,
    );
    assert.equal(
      actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis,
      1 + 3 + 2 + 23 + 3 + 97,
    );
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 6);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 7);
  });
  it('Validates that donations in non-eligible networks are excluded from both pre-analysis and post-analysis', async () => {
    qfRound.eligibleNetworks = [NETWORK_IDS.MAIN_NET];
    await qfRound.save();
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
        user.passportScore = qfRound.minimumPassportScore;
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
                transactionNetworkId: NETWORK_IDS.MAIN_NET,
              },
              user.id,
              project.id,
            );
          }),
        );
      }),
    );

    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user2.passportScore = qfRound.minimumPassportScore;
    await user2.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        qfRoundUserScore: user2.passportScore,
        valueUsd: 35,
        qfRoundId: qfRound.id,
        status: 'verified',
        transactionNetworkId: NETWORK_IDS.ETC,
      },
      user2.id,
      project.id,
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
    assert.equal(actualMatchingFund?.allUsdReceived, 1 + 3 + 2 + 23 + 3 + 97);
    assert.equal(
      actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis,
      1 + 3 + 2 + 23 + 3 + 97,
    );
    assert.equal(actualMatchingFund?.donationIdsAfterAnalysis.length, 6);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 6);
  });
  it('Confirms that donations to flagged fraud projects are not considered', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.passportScore = qfRound.minimumPassportScore;
    await user.save();
    const projectFraud = new ProjectFraud();
    projectFraud.projectId = project.id;
    projectFraud.qfRoundId = qfRound.id;
    await projectFraud.save();
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

    assert.equal(actualMatchingFund?.projectId, project.id);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis.length, 1);
    assert.equal(actualMatchingFund?.donationIdsBeforeAnalysis[0], donation.id);
    assert.isNotOk(actualMatchingFund?.donationIdsAfterAnalysis);
    assert.equal(actualMatchingFund?.allUsdReceived, donation.valueUsd);
    assert.equal(actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis, 0);
    assert.equal(actualMatchingFund?.uniqueQualifiedDonors, 0);
    assert.equal(actualMatchingFund?.totalDonors, 1);

    // qfRound has 4 networks so we just recipient addresses for those networks
    assert.equal(actualMatchingFund?.networkAddresses?.split(',').length, 4);
  });
  it('Ensures pending and failed donation statuses are excluded from both pre-analysis and post-analysis totals', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.passportScore = qfRound.minimumPassportScore;
    await user.save();
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.PENDING,
        valueUsd: 100,
        qfRoundId: qfRound.id,
        qfRoundUserScore: user.passportScore,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.FAILED,
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

    assert.equal(actualMatchingFund?.projectId, project.id);
    assert.isNotOk(actualMatchingFund?.donationIdsBeforeAnalysis);
    assert.isNotOk(actualMatchingFund?.donationIdsAfterAnalysis);
    assert.equal(actualMatchingFund?.allUsdReceived, 0);
    assert.equal(actualMatchingFund?.allUsdReceivedAfterSybilsAnalysis, 0);
    assert.equal(actualMatchingFund?.uniqueQualifiedDonors, 0);
    assert.equal(actualMatchingFund?.totalDonors, 0);

    // qfRound has 4 networks so we just recipient addresses for those networks
    assert.equal(actualMatchingFund?.networkAddresses?.split(',').length, 4);
  });
}
