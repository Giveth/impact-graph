import { assert } from 'chai';
import moment from 'moment';
import { IsNull, Not } from 'typeorm';
import {
  createDonationData,
  createProjectData,
  generateEARoundNumber,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { QfRound } from '../entities/qfRound';
import qAccService from './qAccService';
import { findQfRoundById } from '../repositories/qfRoundRepository';
import {
  getProjectRoundRecord,
  updateOrCreateProjectRoundRecord,
} from '../repositories/projectRoundRecordRepository';

describe('qAccService', () => {
  before(async () => {
    await ProjectRoundRecord.delete({});
    await Donation.delete({ earlyAccessRoundId: Not(IsNull()) });
    await EarlyAccessRound.delete({});
  });

  let project;
  let user;
  let earlyAccessRounds: EarlyAccessRound[] = [];
  let qfRounds: QfRound[] = [];

  async function insertDonation(
    overrides: Partial<
      Pick<Donation, 'amount' | 'earlyAccessRoundId' | 'qfRoundId' | 'status'>
    >,
    userId: number = user.id,
  ) {
    return saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.VERIFIED,
        ...overrides,
      },
      userId,
      project.id,
    );
  }

  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());

    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    earlyAccessRounds = await EarlyAccessRound.save(
      EarlyAccessRound.create([
        {
          roundNumber: generateEARoundNumber(),
          seasonNumber: 1,
          startDate: new Date('2000-01-01'),
          endDate: new Date('2000-01-03'),
          roundPOLCapPerProject: 1_000,
          roundPOLCapPerUserPerProject: 100,
        },
        {
          roundNumber: generateEARoundNumber(),
          seasonNumber: 1,
          startDate: new Date('2000-01-04'),
          endDate: new Date('2000-01-06'),
          roundPOLCapPerProject: 1_000,
          roundPOLCapPerUserPerProject: 100,
        },
        {
          roundNumber: generateEARoundNumber(),
          seasonNumber: 1,
          startDate: new Date('2000-01-07'),
          endDate: new Date('2000-01-09'),
          roundPOLCapPerProject: 1_000,
          roundPOLCapPerUserPerProject: 100,
        },
        {
          roundNumber: generateEARoundNumber(),
          seasonNumber: 1,
          startDate: new Date('2000-01-10'),
          endDate: new Date('2000-01-12'),
          roundPOLCapPerProject: 2_000,
          roundPOLCapPerUserPerProject: 200,
        },
      ]),
    );

    qfRounds = await QfRound.save(
      QfRound.create([
        {
          roundNumber: 1,
          seasonNumber: 1,
          isActive: true,
          name: new Date().toString() + ' - 1',
          allocatedFund: 100,
          minimumPassportScore: 12,
          slug: new Date().getTime().toString() + ' - 1',
          beginDate: moment().subtract(10, 'days').toDate(),
          endDate: moment().subtract(8, 'days').toDate(),
          roundPOLCapPerProject: 10_000,
          roundPOLCloseCapPerProject: 10_500,
          roundPOLCapPerUserPerProject: 2_500,
        },
        {
          roundNumber: 2,
          seasonNumber: 1,
          isActive: true,
          name: new Date().toString() + ' - 2',
          allocatedFund: 100,
          minimumPassportScore: 12,
          slug: new Date().getTime().toString() + ' - 2',
          beginDate: moment().subtract(8, 'days').toDate(),
          endDate: moment().subtract(6, 'days').toDate(),
          roundPOLCapPerProject: 10_000,
          roundPOLCloseCapPerProject: 10_500,
          roundPOLCapPerUserPerProject: 2_500,
        },
      ]),
    );
  });
  afterEach(async () => {
    // Clean up the database after each test
    await ProjectRoundRecord.delete({});
    await Donation.delete({ projectId: project.id });
    await EarlyAccessRound.delete({});
    await QfRound.delete({});
  });

  it('should return correct value for single early access round', async () => {
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(earlyAccessRounds[0].startDate)
        .add(1, 'days')
        .toDate(),
    });

    const firstEarlyAccessRound = earlyAccessRounds[0] as EarlyAccessRound;
    assert.equal(result, firstEarlyAccessRound.roundPOLCapPerUserPerProject!);
  });

  it('should return correct value for single donation in early access round', async () => {
    const donation = await insertDonation({
      earlyAccessRoundId: earlyAccessRounds[0].id,
      amount: 5,
    });
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(earlyAccessRounds[0].startDate)
        .add(1, 'days')
        .toDate(),
    });

    const firstEarlyAccessRound = earlyAccessRounds[0] as EarlyAccessRound;
    assert.equal(
      result,
      firstEarlyAccessRound.roundPOLCapPerUserPerProject! - donation.amount,
    );
  });

  it('should return correct value for multiple donations in early access rounds', async () => {
    const donations = await Promise.all(
      earlyAccessRounds.map((round, index) =>
        insertDonation({
          earlyAccessRoundId: round.id,
          amount: 5 * (index + 1),
        }),
      ),
    );
    let lastRound = earlyAccessRounds[3] as EarlyAccessRound;
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(lastRound.startDate).add(1, 'days').toDate(),
    });

    let donationSum = 0;
    donations.forEach(donation => {
      donationSum += donation.amount;
    });

    // load again
    lastRound = (await EarlyAccessRound.findOneBy({
      id: lastRound.id,
    })) as EarlyAccessRound;
    assert.equal(
      result,
      lastRound!.cumulativePOLCapPerUserPerProject! - donationSum,
    );
  });

  it('should return correct value when a user has donated close to cap', async () => {
    const lastRound = (await EarlyAccessRound.findOneBy({
      id: earlyAccessRounds[3].id,
    })) as EarlyAccessRound;
    await insertDonation({
      earlyAccessRoundId: lastRound.id,
      amount: lastRound.cumulativePOLCapPerUserPerProject! - 100,
    });

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(lastRound.startDate).add(1, 'days').toDate(),
    });

    assert.equal(100, result);
  });

  it('should return correct value for single qf round', async () => {
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    assert.equal(result, qfRounds[0].roundPOLCapPerUserPerProject!);
  });
  it('should return correct value for qf round, when user has donated in ea round', async () => {
    await insertDonation({
      earlyAccessRoundId: earlyAccessRounds[0].id,
      amount: 5,
    });
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    assert.equal(result, qfRounds[0].roundPOLCapPerUserPerProject!);
  });

  it('should return correct value for single donation in qf round', async () => {
    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: 5,
    });

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    assert.equal(result, qfRounds[0].roundPOLCapPerUserPerProject! - 5);
  });

  it('should allow 250 POL donation if qf round cap is filled for new donors', async () => {
    await qfRounds[0].reload();
    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: qfRounds[0].roundPOLCapPerProject!,
    });

    const newUser = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    assert.equal(250, result);
  });

  it('should return correct value for users has donated close to cap if qf round', async () => {
    const amountPOL = qfRounds[0].roundPOLCapPerProject!;

    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: amountPOL,
    });

    const newUser = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRounds[0].id,
        amount: 100,
      },
      newUser.id,
      project.id,
    );

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    assert.equal(150, result);
  });

  it('should return correct value for ea donors if the qf round cap is filled', async () => {
    const eaDonor1 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const eaDonor2 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const newUser1 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const newUser2 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const totalPOLCap = qfRounds[0].roundPOLCapPerProject!;

    await insertDonation(
      {
        earlyAccessRoundId: earlyAccessRounds[0].id,
        amount: 1,
      },
      eaDonor1.id,
    );
    await insertDonation(
      {
        earlyAccessRoundId: earlyAccessRounds[0].id,
        amount: 1,
      },
      eaDonor2.id,
    );

    // donate to the cap
    await insertDonation(
      {
        qfRoundId: qfRounds[0].id,
        amount: totalPOLCap,
      },
      newUser1.id,
    );

    const eaDonor1QfDonationAmount = 10;
    // EA donor 1 donat
    await insertDonation(
      {
        qfRoundId: qfRounds[0].id,
        amount: eaDonor1QfDonationAmount,
      },
      eaDonor1.id,
    );

    const eaDonor1Result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: eaDonor1.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });
    assert.equal(250 - eaDonor1QfDonationAmount, eaDonor1Result);
    const eaDonor2Result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: eaDonor2.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });
    assert.equal(250, eaDonor2Result);

    const newUser1Result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser1.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });
    assert.equal(0, newUser1Result);

    const newUser2Result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser2.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });
    assert.equal(250, newUser2Result);
  });

  it('should return correct value if project has collected close enough in previous rounds', async () => {
    const eaDonor1 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const eaDonor2 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const qfDonor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const totalPOLCap = qfRounds[0].roundPOLCapPerProject!;

    const qfRoundCap = totalPOLCap;

    await insertDonation(
      {
        earlyAccessRoundId: earlyAccessRounds[0].id,
        amount: qfRoundCap / 2,
      },
      eaDonor1.id,
    );

    await insertDonation(
      {
        earlyAccessRoundId: earlyAccessRounds[1].id,
        amount: qfRoundCap / 2,
      },
      eaDonor2.id,
    );

    const qf = await findQfRoundById(qfRounds[0].id);

    assert.equal(qf?.cumulativePOLCapPerProject, totalPOLCap);

    await updateOrCreateProjectRoundRecord(project.id, qfRounds[0].id);
    const qfProjectRoundRecord = await getProjectRoundRecord(
      project.id,
      qfRounds[0].id,
      undefined,
    );

    assert.equal(qfProjectRoundRecord.length, 1);
    assert.equal(
      qfProjectRoundRecord[0].cumulativePastRoundsDonationAmounts,
      qfRoundCap,
    );

    const userCap = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: qfDonor.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    assert.equal(250, userCap);
  });

  it('should return 0 after qf round close cap is reached', async () => {
    const eaDonor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfDonor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const totalPOLCap = qfRounds[0].roundPOLCloseCapPerProject!;

    await insertDonation(
      {
        earlyAccessRoundId: earlyAccessRounds[0].id,
        amount: totalPOLCap,
      },
      eaDonor.id,
    );

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: qfDonor.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    assert.equal(0, result);
  });

  it('should return remaining to close cap if the project has passed qf cap', async () => {
    const eaDonor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfDonor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const totalPOLCap = qfRounds[0].roundPOLCloseCapPerProject!;
    const remainingCap = 30;

    await insertDonation(
      {
        earlyAccessRoundId: earlyAccessRounds[0].id,
        amount: totalPOLCap - remainingCap,
      },
      eaDonor.id,
    );

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: qfDonor.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    assert.equal(remainingCap, result);
  });

  it('should return correct value for qf round, when user has donated in previous qf round', async () => {
    // Add donation in previous round
    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: 2000,
    });

    // Check cap for current round
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(qfRounds[1].beginDate).add(1, 'days').toDate(),
    });

    // User cap should be including previous round donations
    assert.equal(result, qfRounds[1].roundPOLCapPerUserPerProject! - 2000);
  });

  it('should track project total caps across rounds', async () => {
    // Add donation in previous round that reaches project cap
    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: qfRounds[0].roundPOLCapPerProject!,
    });

    // Check cap for current round
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    // Should return 0 since project has reached total cap across rounds
    assert.equal(result, 0);
  });

  it('should consider cumulative donations across all rounds when checking project cap', async () => {
    // Add donation in previous round that uses half of the total cap
    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: 5_000, // Half of the cap
    });

    const newQfRound = await QfRound.create({
      roundNumber: 4,
      seasonNumber: 2,
      isActive: true,
      name: new Date().toString() + ' - 4',
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString() + ' - 4',
      beginDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(1, 'days').toDate(),
      roundPOLCapPerProject: 10_000,
      roundPOLCloseCapPerProject: 10_500,
      roundPOLCapPerUserPerProject: 2_500,
    }).save();

    // Check cap for current round
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(newQfRound.beginDate).add(1, 'days').toDate(),
    });

    // Should only allow up to the remaining cap (considering previous round donations)
    assert.equal(
      result,
      Math.min(
        newQfRound.roundPOLCapPerUserPerProject!,
        newQfRound.roundPOLCapPerProject! - 5_000,
      ),
    );
  });

  it('should return 0 when project has reached total cap across all rounds', async () => {
    // Add donation in previous round that reaches total cap
    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: 10_000, // Full cap
    });

    // Check cap for current round
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    // Should return 0 since project has reached total cap
    assert.equal(result, 0);
  });

  it('should consider EA round donations in total project cap calculation', async () => {
    // Add EA round donation
    await insertDonation({
      earlyAccessRoundId: earlyAccessRounds[0].id,
      amount: 5_000, // Half of QF round cap
    });

    // Check cap for QF round
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    // Should only allow up to the remaining cap (considering EA round donations)
    assert.equal(
      result,
      Math.min(
        qfRounds[0].roundPOLCapPerUserPerProject!,
        qfRounds[0].roundPOLCapPerProject! - 5_000,
      ),
    );
  });

  it('should handle multiple rounds with cumulative project cap', async () => {
    // Add donations in previous rounds
    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: 3_000,
    });

    await insertDonation({
      qfRoundId: qfRounds[1].id,
      amount: 4_000,
    });

    const newQfRound = await QfRound.create({
      roundNumber: 3,
      seasonNumber: 2,
      isActive: true,
      name: new Date().toString() + ' - 3',
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString() + ' - 3',
      beginDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(1, 'days').toDate(),
      roundPOLCapPerProject: 10_000,
      roundPOLCloseCapPerProject: 10_500,
      roundPOLCapPerUserPerProject: 2_500,
    }).save();

    // Check cap for current round
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(newQfRound.beginDate).add(1, 'days').toDate(),
    });

    // Should only allow up to the remaining cap (considering all previous round donations)
    assert.equal(
      result,
      Math.min(
        newQfRound.roundPOLCapPerUserPerProject!,
        newQfRound.roundPOLCapPerProject! - 7_000, // 3000 + 4000 from previous rounds
      ),
    );
  });

  it('should reset user caps but maintain project caps across rounds', async () => {
    // Add donation in previous round that uses 8000 POL
    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: 8_000,
    });

    // Create a second user
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const newQfRound = await QfRound.create({
      roundNumber: 4,
      seasonNumber: 2,
      isActive: true,
      name: new Date().toString() + ' - 4',
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString() + ' - 4',
      beginDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(1, 'days').toDate(),
      roundPOLCapPerProject: 10_000,
      roundPOLCloseCapPerProject: 10_500,
      roundPOLCapPerUserPerProject: 2_500,
    }).save();

    // Check caps for both users in current round
    const result1 = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(newQfRound.beginDate).add(1, 'days').toDate(),
    });

    const result2 = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user2.id,
      donateTime: moment(newQfRound.beginDate).add(1, 'days').toDate(),
    });

    // First user should get their full user cap for the new round
    // But limited by remaining project cap (10000 - 8000 = 2000)
    assert.equal(
      result1,
      Math.min(newQfRound.roundPOLCapPerUserPerProject!, 2_000),
    );

    // Second user should also get their full user cap
    // But limited by the same remaining project cap
    assert.equal(
      result2,
      Math.min(newQfRound.roundPOLCapPerUserPerProject!, 2_000),
    );
  });

  it('should prevent donations when project reaches close cap across rounds', async () => {
    // Add donation in previous round that reaches close cap
    await insertDonation({
      qfRoundId: qfRounds[0].id,
      amount: qfRounds[0].roundPOLCloseCapPerProject!,
    });

    // Check cap for current round
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    // Should return 0 since project has reached close cap across rounds
    assert.equal(result, 0);
  });

  it('should handle EA and QF round donations in cumulative project cap', async () => {
    // Add EA round donation
    await insertDonation({
      earlyAccessRoundId: earlyAccessRounds[0].id,
      amount: 5_000, // Half of QF round cap
    });

    // Add QF round donation from a different user
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await insertDonation(
      {
        qfRoundId: qfRounds[0].id,
        amount: 3_000,
      },
      user2.id,
    );

    // Check cap for original user in current round
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(qfRounds[0].beginDate).add(1, 'days').toDate(),
    });

    // Should get full user cap but limited by remaining project cap
    // Total used: 5000 (EA) + 3000 (QF) = 8000
    // Remaining: 10000 - 8000 = 2000
    assert.equal(
      result,
      Math.min(qfRounds[0].roundPOLCapPerUserPerProject!, 2_000),
    );
  });

  it('should handle multiple rounds with proper cap behavior', async () => {
    // Add donations in previous rounds from different users
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await insertDonation(
      {
        qfRoundId: qfRounds[0].id,
        amount: 3_000,
      },
      user2.id,
    );

    await insertDonation(
      {
        qfRoundId: qfRounds[1].id,
        amount: 4_000,
      },
      user3.id,
    );

    const newQfRound = await QfRound.create({
      roundNumber: 4,
      seasonNumber: 2,
      isActive: true,
      name: new Date().toString() + ' - 4',
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString() + ' - 4',
      beginDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(1, 'days').toDate(),
      roundPOLCapPerProject: 10_000,
      roundPOLCloseCapPerProject: 10_500,
      roundPOLCapPerUserPerProject: 2_500,
    }).save();

    // Check cap for original user in current round
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: moment(newQfRound.beginDate).add(1, 'days').toDate(),
    });

    // Should get full user cap but limited by remaining project cap
    // Total used across rounds: 3000 + 4000 = 7000
    // Remaining: 10000 - 7000 = 3000
    assert.equal(
      result,
      Math.min(newQfRound.roundPOLCapPerUserPerProject!, 3_000),
    );

    // Verify user2 also gets proper cap in new round
    const result2 = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user2.id,
      donateTime: moment(newQfRound.beginDate).add(1, 'days').toDate(),
    });

    // User2 should also get full user cap but limited by same remaining project cap
    assert.equal(
      result2,
      Math.min(newQfRound.roundPOLCapPerUserPerProject!, 3_000),
    );
  });
});
