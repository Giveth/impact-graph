import moment from 'moment';
import axios, { AxiosResponse } from 'axios';
import { ExecutionResult } from 'graphql';
import { assert } from 'chai';
import {
  createDonationData,
  createProjectData,
  generateEARoundNumber,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveEARoundDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { DONATION_STATUS } from '../entities/donation';
import {
  ProjectUserRecordAmounts,
  updateOrCreateProjectUserRecord,
} from '../repositories/projectUserRecordRepository';
import { projectUserTotalDonationAmounts } from '../../test/graphqlQueries';

describe(
  'projectUserTotalDonationAmount() test cases',
  projectUserTotalDonationAmountTestCases,
);

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
