import { assert } from 'chai';
import moment from 'moment';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../../test/testUtils';
import { QfRound } from '../../entities/qfRound';
import { updateUsersWithoutMBDScoreInRound } from './syncUsersModelScore';
import { UserQfRoundModelScore } from '../../entities/userQfRoundModelScore';

describe(
  'updateUsersWithoutMBDScoreInRound() test cases',
  updateUsersWithoutMBDScoreInRoundTestCases,
);

function updateUsersWithoutMBDScoreInRoundTestCases() {
  // for tests it return 1, useful to test cronjob logic and worker
  it('should save the score for users that donated in the round', async () => {
    await QfRound.update({}, { isActive: false });
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    const project = await saveProjectDirectlyToDb(createProjectData());
    project.qfRounds = [qfRound];
    await project.save();

    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        segmentNotified: false,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        segmentNotified: false,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user2.id,
      project.id,
    );

    await updateUsersWithoutMBDScoreInRound();

    const user1ModelScore = await UserQfRoundModelScore.createQueryBuilder(
      'score',
    )
      .where('score."userId" = :userId', { userId: user.id })
      .andWhere('score."qfRoundId" = :qfRoundId', { qfRoundId: qfRound.id })
      .getOne();

    const user2ModelScore = await UserQfRoundModelScore.createQueryBuilder(
      'score',
    )
      .where('score."userId" = :userId', { userId: user2.id })
      .andWhere('score."qfRoundId" = :qfRoundId', { qfRoundId: qfRound.id })
      .getOne();

    // base values for mocks
    assert.equal(user1ModelScore?.score, 1);
    assert.equal(user2ModelScore?.score, 1);

    qfRound.isActive = false;
    await qfRound.save();
  });
}
