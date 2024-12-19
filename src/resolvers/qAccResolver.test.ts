import moment from 'moment';
import axios, { AxiosResponse } from 'axios';
import sinon from 'sinon';
import { ExecutionResult } from 'graphql';
import { assert } from 'chai';
import {
  createDonationData,
  createProjectData,
  generateEARoundNumber,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveEARoundDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { Donation, DONATION_STATUS } from '../entities/donation';
import {
  ProjectUserRecordAmounts,
  updateOrCreateProjectUserRecord,
} from '../repositories/projectUserRecordRepository';
import {
  projectUserDonationCap,
  projectUserTotalDonationAmounts,
  qAccStat,
  userCaps,
} from '../../test/graphqlQueries';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import {
  GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE,
  GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE,
} from '../constants/gitcoin';
import { PrivadoAdapter } from '../adapters/privado/privadoAdapter';
import { AppDataSource } from '../orm';

describe(
  'projectUserTotalDonationAmount() test cases',
  projectUserTotalDonationAmountTestCases,
);

describe(
  'projectUserDonationCap() test cases',
  projectUserDonationCapTestCases,
);

describe('userCaps() test cases', userCapsTestCases);

describe('qAccStat() test cases', qAccStatTestCases);

function projectUserTotalDonationAmountTestCases() {
  it('should return total donation amount of a user for a project', async () => {
    it('should return total donation amount of a user for a project', async () => {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      const project = await saveProjectDirectlyToDb(createProjectData());

      const ea1 = await saveEARoundDirectlyToDb({
        roundNumber: generateEARoundNumber(),
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-05'),
      });
      const ea2 = await saveEARoundDirectlyToDb({
        roundNumber: generateEARoundNumber(),
        startDate: new Date('2024-09-06'),
        endDate: new Date('2024-09-10'),
      });

      const qfRoundNumber = generateEARoundNumber();
      const qfRound = await QfRound.create({
        isActive: true,
        name: 'test qf ',
        allocatedFund: 100,
        minimumPassportScore: 8,
        slug: 'QF - 2024-09-10 - ' + qfRoundNumber,
        roundNumber: qfRoundNumber,
        beginDate: moment('2024-09-10').add(1, 'days').toDate(),
        endDate: moment('2024-09-10').add(10, 'days').toDate(),
      }).save();

      const ea1DonationAmount = 100;
      const ea2DonationAmount = 200;
      const qfDonationAmount = 400;

      await saveDonationDirectlyToDb(
        {
          ...createDonationData(),
          amount: ea1DonationAmount,
          status: DONATION_STATUS.VERIFIED,
          earlyAccessRoundId: ea1.id,
        },
        user.id,
        project.id,
      );
      await saveDonationDirectlyToDb(
        {
          ...createDonationData(),
          amount: ea2DonationAmount,
          status: DONATION_STATUS.VERIFIED,
          earlyAccessRoundId: ea2.id,
        },
        user.id,
        project.id,
      );
      await saveDonationDirectlyToDb(
        {
          ...createDonationData(),
          amount: qfDonationAmount,
          status: DONATION_STATUS.VERIFIED,
          qfRoundId: qfRound.id,
        },
        user.id,
        project.id,
      );
      await updateOrCreateProjectUserRecord({
        projectId: project.id,
        userId: user.id,
      });

      const result: AxiosResponse<
        ExecutionResult<{
          projectUserTotalDonationAmounts: ProjectUserRecordAmounts;
        }>
      > = await axios.post(graphqlUrl, {
        query: projectUserTotalDonationAmounts,
        variables: {
          projectId: project.id,
          userId: user.id,
        },
      });

      assert.isOk(result.data);
      assert.deepEqual(result.data.data?.projectUserTotalDonationAmounts, {
        eaTotalDonationAmount: ea1DonationAmount + ea2DonationAmount,
        qfTotalDonationAmount: qfDonationAmount,
        totalDonationAmount:
          ea1DonationAmount + ea2DonationAmount + qfDonationAmount,
      });
    });
  });
}

function projectUserDonationCapTestCases() {
  let project;
  let user;
  let accessToken;
  let earlyAccessRounds: EarlyAccessRound[] = [];
  let qfRound1: QfRound;

  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());

    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    accessToken = await generateTestAccessToken(user.id);

    earlyAccessRounds = await EarlyAccessRound.save(
      EarlyAccessRound.create([
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-01'),
          endDate: new Date('2000-01-03'),
          roundUSDCapPerProject: 1000,
          roundUSDCapPerUserPerProject: 100,
          tokenPrice: 0.1,
        },
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-04'),
          endDate: new Date('2000-01-06'),
          roundUSDCapPerProject: 1000,
          roundUSDCapPerUserPerProject: 100,
          tokenPrice: 0.2,
        },
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-07'),
          endDate: new Date('2000-01-09'),
          roundUSDCapPerProject: 1000,
          roundUSDCapPerUserPerProject: 100,
          tokenPrice: 0.3,
        },
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-10'),
          endDate: new Date('2000-01-12'),
          roundUSDCapPerProject: 2000,
          roundUSDCapPerUserPerProject: 200,
          tokenPrice: 0.4,
        },
      ]),
    );

    qfRound1 = await QfRound.create({
      roundNumber: 1,
      isActive: true,
      name: new Date().toString() + ' - 1',
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString() + ' - 1',
      beginDate: new Date('2001-01-14'),
      endDate: new Date('2001-01-16'),
      roundUSDCapPerProject: 10000,
      roundUSDCapPerUserPerProject: 2500,
      tokenPrice: 0.5,
    }).save();
  });
  afterEach(async () => {
    // Clean up the database after each test
    await ProjectRoundRecord.delete({});
    await Donation.delete({ projectId: project.id });
    await EarlyAccessRound.delete({});
    await QfRound.delete(qfRound1.id);

    sinon.restore();
  });

  it('should return correct value for single early access round', async () => {
    sinon.useFakeTimers({
      now: earlyAccessRounds[0].startDate.getTime(),
    });

    const result: AxiosResponse<
      ExecutionResult<{
        projectUserDonationCap: number;
      }>
    > = await axios.post(
      graphqlUrl,
      {
        query: projectUserDonationCap,
        variables: {
          projectId: project.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const firstEarlyAccessRound = earlyAccessRounds[0] as EarlyAccessRound;
    assert.isOk(result.data);
    assert.equal(
      result.data.data?.projectUserDonationCap,
      firstEarlyAccessRound.roundUSDCapPerUserPerProject! /
        firstEarlyAccessRound.tokenPrice!,
    );
  });
}

function userCapsTestCases() {
  let project;
  let user;
  let accessToken;
  let qfRound1: QfRound;
  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());

    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    accessToken = await generateTestAccessToken(user.id);

    qfRound1 = await QfRound.create({
      roundNumber: 1,
      isActive: true,
      name: new Date().toString() + ' - 1',
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString() + ' - 1',
      beginDate: new Date('2001-01-14'),
      endDate: new Date('2001-01-16'),
      roundUSDCapPerProject: 10000,
      roundUSDCapPerUserPerProject: 2500,
      roundUSDCapPerUserPerProjectWithGitcoinScoreOnly: 1000,
      tokenPrice: 0.5,
    }).save();
    sinon.useFakeTimers({
      now: new Date('2001-01-15').getTime(),
    });
  });
  afterEach(async () => {
    // Clean up the database after each test
    await ProjectRoundRecord.delete({});
    await Donation.delete({ projectId: project.id });
    await QfRound.delete(qfRound1.id);

    sinon.restore();
  });
  it('should return correct caps for a user with analysis score', async () => {
    // Save donations
    const donationAmount = 100;
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: donationAmount,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound1.id,
      },
      user.id,
      project.id,
    );

    // Simulate valid analysis score
    user.analysisScore = 80;
    user.passportScore = 0;
    user.passportScoreUpdateTimestamp = new Date();
    await user.save();

    const response: ExecutionResult<{
      data: {
        userCaps: {
          qAccCap: number;
          gitcoinPassport?: {
            unusedCap: number;
          };
          zkId?: {
            unusedCap: number;
          };
        };
      };
    }> = await axios.post(
      graphqlUrl,
      {
        query: userCaps,
        variables: { projectId: project.id },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      response.data?.data.userCaps?.qAccCap,
      Number(qfRound1.roundUSDCapPerUserPerProject) /
        Number(qfRound1.tokenPrice) -
        donationAmount,
    );
    assert.equal(
      response.data?.data.userCaps?.gitcoinPassport?.unusedCap,
      Number(qfRound1.roundUSDCapPerUserPerProjectWithGitcoinScoreOnly) /
        Number(qfRound1.tokenPrice) -
        donationAmount,
    );
    assert.isNull(response.data?.data.userCaps?.zkId);
  });

  it('should return correct caps for a user with passport score', async () => {
    // Save donations
    const donationAmount = 100;
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: donationAmount,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound1.id,
      },
      user.id,
      project.id,
    );

    // Simulate valid GitcoinPassport score
    user.analysisScore = 0;
    user.passportScore = 30;
    user.passportScoreUpdateTimestamp = new Date();
    await user.save();

    const response: ExecutionResult<{
      data: {
        userCaps: {
          qAccCap: number;
          gitcoinPassport?: {
            unusedCap: number;
          };
          zkId?: {
            unusedCap: number;
          };
        };
      };
    }> = await axios.post(
      graphqlUrl,
      {
        query: userCaps,
        variables: { projectId: project.id },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      response.data?.data.userCaps?.qAccCap,
      Number(qfRound1.roundUSDCapPerUserPerProject) /
        Number(qfRound1.tokenPrice) -
        donationAmount,
    );
    assert.equal(
      response.data?.data.userCaps?.gitcoinPassport?.unusedCap,
      Number(qfRound1.roundUSDCapPerUserPerProjectWithGitcoinScoreOnly) /
        Number(qfRound1.tokenPrice) -
        donationAmount,
    );
    assert.isNull(response.data?.data.userCaps?.zkId);
  });

  it('should return correct caps for a user with ZkId', async () => {
    // Save donations
    const donationAmount = 500;
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: donationAmount,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound1.id,
      },
      user.id,
      project.id,
    );

    user.privadoVerifiedRequestIds = [PrivadoAdapter.privadoRequestId];
    await user.save();

    const response: ExecutionResult<{
      data: {
        userCaps: {
          qAccCap: number;
          gitcoinPassport?: {
            unusedCap: number;
          };
          zkId?: {
            unusedCap: number;
          };
        };
      };
    }> = await axios.post(
      graphqlUrl,
      {
        query: userCaps,
        variables: { projectId: project.id },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    // Assert: Verify the response matches expected values
    assert.equal(
      response.data?.data.userCaps?.qAccCap,
      Number(qfRound1.roundUSDCapPerUserPerProject) /
        Number(qfRound1.tokenPrice) -
        donationAmount,
    );
    assert.equal(
      response.data?.data.userCaps?.zkId?.unusedCap,
      Number(qfRound1.roundUSDCapPerUserPerProject) /
        Number(qfRound1.tokenPrice) -
        donationAmount,
    );
    assert.isNull(response.data?.data.userCaps?.gitcoinPassport);
  });

  it('should throw an error if the user does not meet the minimum analysis score and passport score', async () => {
    // Simulate invalid GitcoinPassport scores
    user.analysisScore = 40;
    user.passportScore = 10;
    user.passportScoreUpdateTimestamp = new Date();
    await user.save();

    // Act: Call the resolver through a GraphQL query and expect an error
    try {
      await axios.post(
        graphqlUrl,
        {
          query: userCaps,
          variables: { projectId: project.id },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (error: any) {
      // Assert: Verify the error message
      assert.equal(
        error.response.data.errors[0].message,
        `analysis score is less than ${GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE}
         and passport score is less than ${GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE}`,
      );
    }
  });
}

function qAccStatTestCases() {
  let project;
  let user;
  let qfRound1: QfRound;
  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());
    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    qfRound1 = await QfRound.create({
      roundNumber: 1,
      isActive: true,
      name: new Date().toString() + ' - 1',
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString() + ' - 1',
      beginDate: new Date('2001-01-14'),
      endDate: new Date('2001-01-16'),
      roundUSDCapPerProject: 10000,
      roundUSDCapPerUserPerProject: 2500,
      roundUSDCapPerUserPerProjectWithGitcoinScoreOnly: 1000,
      tokenPrice: 0.5,
    }).save();
    sinon.useFakeTimers({
      now: new Date('2001-01-15').getTime(),
    });
  });
  afterEach(async () => {
    // Clean up the database after each test
    await ProjectRoundRecord.delete({});
    await Donation.delete({ projectId: project.id });
    await QfRound.delete(qfRound1.id);

    sinon.restore();
  });
  it('should return correct qacc stats', async () => {
    const qfDonationAmount = Math.round(Math.random() * 1_000_000_00) / 100;
    const nonQfDonationAmount = Math.round(Math.random() * 1_000_000_00) / 100;

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: nonQfDonationAmount,
        status: DONATION_STATUS.VERIFIED,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: qfDonationAmount,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound1.id,
      },
      user.id,
      project.id,
    );
    const result: AxiosResponse<
      ExecutionResult<{
        qAccStat: {
          totalCollected: number;
          qfTotalCollected: number;
          contributorsCount: number;
        };
      }>
    > = await axios.post(graphqlUrl, {
      query: qAccStat,
    });

    assert.isOk(result.data);

    const dataSource = AppDataSource.getDataSource();
    const totalDonations = await dataSource.query(`
      SELECT COALESCE(SUM(amount), 0) as totalCollected from donation where status = '${DONATION_STATUS.VERIFIED}'
      `);
    const qfTotalDonations = await dataSource.query(`
      SELECT COALESCE(SUM(amount), 0) as qfTotalCollected from donation where status = '${DONATION_STATUS.VERIFIED}' AND "qfRoundId" IS NOT NULL
      `);
    // count unique contributors
    const contributorsCount = await Donation.createQueryBuilder('donation')
      .select('COUNT(DISTINCT "userId")', 'contributorsCount')
      .where('donation.status = :status', {
        status: DONATION_STATUS.VERIFIED,
      })
      .getRawOne();

    assert.deepEqual(result.data.data?.qAccStat, {
      totalCollected: totalDonations[0].totalcollected,
      qfTotalCollected: qfTotalDonations[0].qftotalcollected,
      contributorsCount: +contributorsCount?.contributorsCount,
    });
  });
}
