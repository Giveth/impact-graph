import { assert } from 'chai';
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

describe('qAccService', () => {
  before(async () => {
    await ProjectRoundRecord.delete({});
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
  ) {
    return saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.VERIFIED,
        ...overrides,
      },
      user.id,
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
  });

  it('should return correct value for single early access round', async () => {
    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: user.id,
      donateTime: earlyAccessRounds[0].startDate,
    });

    const firstEarlyAccessRound = earlyAccessRounds[0] as EarlyAccessRound;
    assert.equal(
      result,
      firstEarlyAccessRound.roundUSDCapPerUserPerProject! /
        firstEarlyAccessRound.tokenPrice!,
    );
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
      firstEarlyAccessRound.roundUSDCapPerUserPerProject! /
        firstEarlyAccessRound.tokenPrice! -
        donation.amount,
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
      lastRound!.cumulativeCapPerUserPerProject! / lastRound!.tokenPrice! -
        donationSum,
    );
  });

  it('should return correct value when a user has donated close to cap', async () => {
    const lastRound = (await EarlyAccessRound.findOneBy({
      id: earlyAccessRounds[3].id,
    })) as EarlyAccessRound;
    await insertDonation({
      earlyAccessRoundId: lastRound.id,
      amount:
        lastRound.cumulativeCapPerUserPerProject! / lastRound.tokenPrice! - 100,
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

    assert.equal(
      result,
      qfRound1.roundUSDCapPerUserPerProject! / qfRound1.tokenPrice!,
    );
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

    assert.equal(
      result,
      qfRound1.roundUSDCapPerUserPerProject! / qfRound1.tokenPrice! - 5,
    );
  });

  it('should allow 250$ donation if qf round cap is filled for early access donors', async () => {
    await insertDonation({
      qfRoundId: qfRound1.id,
      amount: qfRound1.roundUSDCapPerProject! / qfRound1.tokenPrice!,
    });

    const newUser = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser.id,
      donateTime: qfRound1.beginDate,
    });

    assert.equal(250 / qfRound1.tokenPrice!, result);
  });

  it('should return correct value for users has donated close to cap if qf round', async () => {
    await insertDonation({
      qfRoundId: qfRound1.id,
      amount: (qfRound1.roundUSDCapPerProject! - 150) / qfRound1.tokenPrice!,
    });

    const newUser = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound1.id,
        amount: 100 / qfRound1.tokenPrice!,
      },
      newUser.id,
      project.id,
    );

    const result = await qAccService.getQAccDonationCap({
      projectId: project.id,
      userId: newUser.id,
      donateTime: qfRound1.beginDate,
    });

    assert.equal(150 / qfRound1.tokenPrice!, result);
  });
});
