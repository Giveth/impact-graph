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
  let qfRound1: QfRound;

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
          startDate: new Date('2000-01-01'),
          endDate: new Date('2000-01-03'),
          roundPOLCapPerProject: 1_000,
          roundPOLCapPerUserPerProject: 100,
        },
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-04'),
          endDate: new Date('2000-01-06'),
          roundPOLCapPerProject: 1_000,
          roundPOLCapPerUserPerProject: 100,
        },
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-07'),
          endDate: new Date('2000-01-09'),
          roundPOLCapPerProject: 1_000,
          roundPOLCapPerUserPerProject: 100,
        },
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-10'),
          endDate: new Date('2000-01-12'),
          roundPOLCapPerProject: 2_000,
          roundPOLCapPerUserPerProject: 200,
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
      beginDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(1, 'days').toDate(),
      roundPOLCapPerProject: 10_000,
      roundPOLCloseCapPerProject: 10_500,
      roundPOLCapPerUserPerProject: 2_500,
    }).save();
  });
  afterEach(async () => {
    // Clean up the database after each test
    await ProjectRoundRecord.delete({});
    await Donation.delete({ projectId: project.id });
    await EarlyAccessRound.delete({});
    await QfRound.delete(qfRound1.id);
  });

  it('should return correct value for single early access round', async () => {
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: earlyAccessRounds[0].startDate,
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
      donateTime: earlyAccessRounds[0].startDate,
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
      donateTime: lastRound.startDate,
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
      donateTime: lastRound.startDate,
    });

    assert.equal(100, result);
  });

  it('should return correct value for single qf round', async () => {
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: qfRound1.beginDate,
    });

    assert.equal(result, qfRound1.roundPOLCapPerUserPerProject!);
  });
  it('should return correct value for qf round, when user has donated in ea', async () => {
    await insertDonation({
      earlyAccessRoundId: earlyAccessRounds[0].id,
      amount: 5,
    });
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: qfRound1.beginDate,
    });

    assert.equal(result, qfRound1.roundPOLCapPerUserPerProject!);
  });

  it('should return correct value for single donation in qf round', async () => {
    await insertDonation({
      qfRoundId: qfRound1.id,
      amount: 5,
    });

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: qfRound1.beginDate,
    });

    assert.equal(result, qfRound1.roundPOLCapPerUserPerProject! - 5);
  });

  it('should allow 250 POL donation if qf round cap is filled for new donors', async () => {
    await qfRound1.reload();
    await insertDonation({
      qfRoundId: qfRound1.id,
      amount: qfRound1.roundPOLCapPerProject!,
    });

    const newUser = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser.id,
      donateTime: qfRound1.beginDate,
    });

    assert.equal(250, result);
  });

  it('should return correct value for users has donated close to cap if qf round', async () => {
    const amountPOL = qfRound1.roundPOLCapPerProject!;

    await insertDonation({
      qfRoundId: qfRound1.id,
      amount: amountPOL,
    });

    const newUser = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound1.id,
        amount: 100,
      },
      newUser.id,
      project.id,
    );

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser.id,
      donateTime: qfRound1.beginDate,
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

    const totalPOLCap = qfRound1.roundPOLCapPerProject!;

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
        qfRoundId: qfRound1.id,
        amount: totalPOLCap,
      },
      newUser1.id,
    );

    const eaDonor1QfDonationAmount = 10;
    // EA donor 1 donat
    await insertDonation(
      {
        qfRoundId: qfRound1.id,
        amount: eaDonor1QfDonationAmount,
      },
      eaDonor1.id,
    );

    const eaDonor1Result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: eaDonor1.id,
      donateTime: qfRound1.beginDate,
    });
    assert.equal(250 - eaDonor1QfDonationAmount, eaDonor1Result);
    const eaDonor2Result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: eaDonor2.id,
    });
    assert.equal(250, eaDonor2Result);

    const newUser1Result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser1.id,
      donateTime: qfRound1.beginDate,
    });
    assert.equal(0, newUser1Result);

    const newUser2Result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser2.id,
      donateTime: qfRound1.beginDate,
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

    const totalPOLCap = qfRound1.roundPOLCapPerProject!;

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

    const qf = await findQfRoundById(qfRound1.id);

    assert.equal(qf?.cumulativePOLCapPerProject, totalPOLCap);

    await updateOrCreateProjectRoundRecord(project.id, qfRound1.id);
    const qfProjectRoundRecord = await getProjectRoundRecord(
      project.id,
      qfRound1.id,
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
      donateTime: qfRound1.beginDate,
    });

    assert.equal(250, userCap);
  });

  it('should return 0 after qf round close cap is reached', async () => {
    const eaDonor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfDonor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const totalPOLCap = qfRound1.roundPOLCloseCapPerProject!;

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
      donateTime: qfRound1.beginDate,
    });

    assert.equal(0, result);
  });

  it('should return remaining to close cap if the project has passed qf cap', async () => {
    const eaDonor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfDonor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const totalPOLCap = qfRound1.roundPOLCloseCapPerProject!;
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
      donateTime: qfRound1.beginDate,
    });

    assert.equal(remainingCap, result);
  });
});
