import { expect } from 'chai';
import {
  createDonationData,
  createProjectData,
  generateQfRoundNumber,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import {
  getCumulativePastRoundsDonationAmounts,
  getProjectRoundRecord,
  updateOrCreateProjectRoundRecord,
} from './projectRoundRecordRepository';
import { QfRound } from '../entities/qfRound';

describe('ProjectRoundRecord test cases', () => {
  let projectId: number;
  let earlyAccessRound1, earlyAccessRound2, earlyAccessRound3;
  let qfRound1, qfRound2;

  async function insertDonation({
    amount,
    valueUsd,
    earlyAccessRoundId,
    qfRoundId,
  }: {
    amount: number;
    valueUsd: number;
    earlyAccessRoundId?: number;
    qfRoundId?: number;
  }) {
    return saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount,
        valueUsd,
        earlyAccessRoundId,
        qfRoundId,
        status: DONATION_STATUS.VERIFIED,
      },
      SEED_DATA.FIRST_USER.id,
      projectId,
    );
  }
  beforeEach(async () => {
    // Create a project for testing
    const project = await saveProjectDirectlyToDb(createProjectData());
    projectId = project.id;

    const earlyAccessRounds = await EarlyAccessRound.create([
      {
        roundNumber: 1,
        startDate: new Date('2000-01-01'),
        endDate: new Date('2000-01-02'),
      },
      {
        roundNumber: 2,
        startDate: new Date('2000-01-02'),
        endDate: new Date('2000-01-03'),
      },
      {
        roundNumber: 3,
        startDate: new Date('2000-01-03'),
        endDate: new Date('2000-01-04'),
      },
    ]);
    await EarlyAccessRound.save(earlyAccessRounds);
    [earlyAccessRound1, earlyAccessRound2, earlyAccessRound3] =
      earlyAccessRounds;

    qfRound1 = await QfRound.create({
      roundNumber: generateQfRoundNumber(),
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: new Date('2001-01-01'),
      endDate: new Date('2001-01-03'),
    }).save();
    qfRound2 = await QfRound.create({
      roundNumber: generateQfRoundNumber(),
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: new Date('2001-02-01'),
      endDate: new Date('2001-03-03'),
    }).save();
  });

  afterEach(async () => {
    // Clean up the database after each test
    await ProjectRoundRecord.delete({});
    await Donation.delete({ projectId });
    await EarlyAccessRound.delete({});
  });

  describe('updateOrCreateProjectRoundRecord test cases', () => {
    it('should create a new round record if none exists', async () => {
      const amount = 100;
      const valueUsd = 150;

      await insertDonation({ amount, valueUsd });

      await updateOrCreateProjectRoundRecord(projectId);

      const record = await ProjectRoundRecord.findOne({
        where: { projectId },
      });

      expect(record).to.exist;
      expect(record?.totalDonationAmount).to.equal(amount);
      expect(record?.totalDonationUsdAmount).to.equal(valueUsd);
    });

    it('should update an existing round record with two amounts', async () => {
      const donationAmount = 100;
      const donationUsdAmount = 150;
      const secondDonationAmount = 50;
      const secondDonatinUsdAmount = 75;

      await insertDonation({
        amount: donationAmount,
        valueUsd: donationUsdAmount,
      });
      await insertDonation({
        amount: secondDonationAmount,
        valueUsd: secondDonatinUsdAmount,
      });
      // Update the existing record
      await updateOrCreateProjectRoundRecord(projectId);

      const record = await ProjectRoundRecord.findOne({
        where: { projectId },
      });

      expect(record).to.exist;
      expect(record?.totalDonationAmount).to.equal(
        donationAmount + secondDonationAmount,
      );
      expect(record?.totalDonationUsdAmount).to.equal(
        donationUsdAmount + secondDonatinUsdAmount,
      );
    });

    it('should create a separate record for different early access rounds', async () => {
      const donationAmount1 = 100;
      const donationUsdAmount1 = 150;
      const donationAmount2 = 200;
      const donationUsdAmount2 = 250;

      insertDonation({
        amount: donationAmount1,
        valueUsd: donationUsdAmount1,
        earlyAccessRoundId: earlyAccessRound1.id,
      });
      insertDonation({
        amount: donationAmount2,
        valueUsd: donationUsdAmount2,
        earlyAccessRoundId: earlyAccessRound2.id,
      });

      // First round
      await updateOrCreateProjectRoundRecord(
        projectId,
        undefined,
        earlyAccessRound1.id,
      );

      // Second round
      await updateOrCreateProjectRoundRecord(
        projectId,
        undefined,
        earlyAccessRound2.id,
      );

      const roundRecord1 = await ProjectRoundRecord.findOne({
        where: { projectId, earlyAccessRoundId: earlyAccessRound1.id },
      });

      const roundRecord2 = await ProjectRoundRecord.findOne({
        where: { projectId, earlyAccessRoundId: earlyAccessRound2.id },
      });

      expect(roundRecord1).to.exist;
      expect(roundRecord2).to.exist;

      expect(roundRecord1?.totalDonationAmount).to.equal(donationAmount1);
      expect(roundRecord1?.totalDonationUsdAmount).to.equal(donationUsdAmount1);

      expect(roundRecord2?.totalDonationAmount).to.equal(donationAmount2);
      expect(roundRecord2?.totalDonationUsdAmount).to.equal(donationUsdAmount2);
    });
  });

  describe('getProjectRoundRecord test cases', () => {
    it('should return an empty array if no round record exists', async () => {
      const records = await getProjectRoundRecord(projectId);
      expect(records).to.be.an('array').that.is.empty;
    });

    it('should return the correct round record for a project', async () => {
      const donationAmount = 100;
      const donationUsdAmount = 150;

      await insertDonation({
        amount: donationAmount,
        valueUsd: donationUsdAmount,
      });
      // Create a round record
      await updateOrCreateProjectRoundRecord(projectId);

      const records = await getProjectRoundRecord(projectId);

      expect(records).to.have.lengthOf(1);
      expect(records[0].totalDonationAmount).to.equal(donationAmount);
      expect(records[0].totalDonationUsdAmount).to.equal(donationUsdAmount);
    });

    it('should return the correct round record for a specific early access round', async () => {
      const donationAmount = 100;
      const donationUsdAmount = 150;
      await insertDonation({
        amount: donationAmount,
        valueUsd: donationUsdAmount,
        earlyAccessRoundId: earlyAccessRound1.id,
      });

      // Create a round record
      await updateOrCreateProjectRoundRecord(
        projectId,
        null,
        earlyAccessRound1.id,
      );

      const records = await getProjectRoundRecord(
        projectId,
        undefined,
        earlyAccessRound1.id,
      );

      expect(records).to.have.lengthOf(1);
      expect(records[0].totalDonationAmount).to.equal(donationAmount);
      expect(records[0].totalDonationUsdAmount).to.equal(donationUsdAmount);
    });
  });

  describe('getProjectRoundRecord test cases', () => {
    it('should return null when no round is specified', async () => {
      const result = await getCumulativePastRoundsDonationAmounts({
        projectId,
      });

      expect(result).to.be.null;
    });

    it('should return the cumulative donation amount for a project', async () => {
      const round1Donations: number[] = Array.from({ length: 5 }, () => {
        return parseFloat((Math.random() * 1e6).toFixed(2));
      });

      const round2Donations: number[] = Array.from({ length: 5 }, () => {
        return parseFloat((Math.random() * 1e6).toFixed(2));
      });

      let total = 0;

      for (const round1Donation of round1Donations) {
        total += round1Donation;
        await insertDonation({
          amount: round1Donation,
          valueUsd: round1Donation * 1.5,
          earlyAccessRoundId: earlyAccessRound1.id,
        });
      }
      for (const round2Donation of round2Donations) {
        total += round2Donation;
        await insertDonation({
          amount: round2Donation,
          valueUsd: round2Donation * 1.25,
          earlyAccessRoundId: earlyAccessRound2.id,
        });
      }

      total = parseFloat(total.toFixed(2));

      // First round
      await updateOrCreateProjectRoundRecord(
        projectId,
        undefined,
        earlyAccessRound1.id,
      );

      // Second round
      await updateOrCreateProjectRoundRecord(
        projectId,
        undefined,
        earlyAccessRound2.id,
      );

      const result = await getCumulativePastRoundsDonationAmounts({
        projectId,
        earlyAccessRoundId: earlyAccessRound3.id,
      });

      expect(result).to.equal(total);
    });

    it('should return the cumulative donation amount for a project for a specific qf access round', async () => {
      const round1Donations: number[] = Array.from({ length: 5 }, () => {
        return parseFloat((Math.random() * 1e6).toFixed(2));
      });
      const round2Donations: number[] = Array.from({ length: 5 }, () => {
        return parseFloat((Math.random() * 1e6).toFixed(2));
      });
      const round3Donations: number[] = Array.from({ length: 5 }, () => {
        return parseFloat((Math.random() * 1e6).toFixed(2));
      });
      const qfRound1Donations: number[] = Array.from({ length: 5 }, () => {
        return parseFloat((Math.random() * 1e6).toFixed(2));
      });

      let total = 0;

      for (const round1Donation of round1Donations) {
        total += round1Donation;
        await insertDonation({
          amount: round1Donation,
          valueUsd: round1Donation * 1.5,
          earlyAccessRoundId: earlyAccessRound1.id,
        });
      }
      for (const round2Donation of round2Donations) {
        total += round2Donation;
        await insertDonation({
          amount: round2Donation,
          valueUsd: round2Donation * 1.25,
          earlyAccessRoundId: earlyAccessRound2.id,
        });
      }
      for (const round3Donation of round3Donations) {
        total += round3Donation;
        await insertDonation({
          amount: round3Donation,
          valueUsd: round3Donation * 1.25,
          earlyAccessRoundId: earlyAccessRound3.id,
        });
      }
      for (const qfRound1Donation of qfRound1Donations) {
        total += qfRound1Donation;
        await insertDonation({
          amount: qfRound1Donation,
          valueUsd: qfRound1Donation * 1.25,
          qfRoundId: qfRound1.id,
        });
      }

      total = parseFloat(total.toFixed(2));

      await updateOrCreateProjectRoundRecord(
        projectId,
        undefined,
        earlyAccessRound1.id,
      );
      await updateOrCreateProjectRoundRecord(
        projectId,
        undefined,
        earlyAccessRound2.id,
      );
      await updateOrCreateProjectRoundRecord(
        projectId,
        undefined,
        earlyAccessRound3.id,
      );
      await updateOrCreateProjectRoundRecord(projectId, qfRound1.id, undefined);

      const result = await getCumulativePastRoundsDonationAmounts({
        projectId,
        qfRoundId: qfRound2.id,
      });
      expect(result).to.equal(total);
    });
  });
});
