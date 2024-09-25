import { expect } from 'chai';
import {
  updateOrCreateDonationSummary,
  getDonationSummary,
} from './projectDonationSummaryRepository';
import { ProjectDonationSummary } from '../entities/projectDonationSummary';
import {
  createProjectData,
  DONATION_SEED_DATA,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { Donation, DONATION_STATUS } from '../entities/donation';

describe('DonationSummary test cases', () => {
  let projectId: number;

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
        ...DONATION_SEED_DATA.FIRST_DONATION,
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
  });

  afterEach(async () => {
    // Clean up the database after each test
    await ProjectDonationSummary.delete({});
    await Donation.delete({ projectId });
    await EarlyAccessRound.delete({});
  });

  describe('updateOrCreateDonationSummary test cases', () => {
    it('should create a new donation summary if none exists', async () => {
      const amount = 100;
      const valueUsd = 150;

      await insertDonation({ amount, valueUsd });

      await updateOrCreateDonationSummary(projectId);

      const summary = await ProjectDonationSummary.findOne({
        where: { projectId },
      });

      expect(summary).to.exist;
      expect(summary?.totalDonationAmount).to.equal(amount);
      expect(summary?.totalDonationUsdAmount).to.equal(valueUsd);
    });

    it('should update an existing donation summary with two amounts', async () => {
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
      // Update the existing summary
      await updateOrCreateDonationSummary(projectId);

      const summary = await ProjectDonationSummary.findOne({
        where: { projectId },
      });

      expect(summary).to.exist;
      expect(summary?.totalDonationAmount).to.equal(
        donationAmount + secondDonationAmount,
      );
      expect(summary?.totalDonationUsdAmount).to.equal(
        donationUsdAmount + secondDonatinUsdAmount,
      );
    });

    it('should create a separate summary for different early access rounds', async () => {
      const donationAmount1 = 100;
      const donationUsdAmount1 = 150;
      const donationAmount2 = 200;
      const donationUsdAmount2 = 250;

      const earlyAccessRound1 = await EarlyAccessRound.create({
        roundNumber: 1,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-05'),
      }).save();
      const earlyAccessRound2 = await EarlyAccessRound.create({
        roundNumber: 2,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-05'),
      }).save();

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
      await updateOrCreateDonationSummary(
        projectId,
        undefined,
        earlyAccessRound1.id,
      );

      // Second round
      await updateOrCreateDonationSummary(
        projectId,
        undefined,
        earlyAccessRound2.id,
      );

      const summaryRound1 = await ProjectDonationSummary.findOne({
        where: { projectId, earlyAccessRoundId: earlyAccessRound1.id },
      });

      const summaryRound2 = await ProjectDonationSummary.findOne({
        where: { projectId, earlyAccessRoundId: earlyAccessRound2.id },
      });

      expect(summaryRound1).to.exist;
      expect(summaryRound2).to.exist;

      expect(summaryRound1?.totalDonationAmount).to.equal(donationAmount1);
      expect(summaryRound1?.totalDonationUsdAmount).to.equal(
        donationUsdAmount1,
      );

      expect(summaryRound2?.totalDonationAmount).to.equal(donationAmount2);
      expect(summaryRound2?.totalDonationUsdAmount).to.equal(
        donationUsdAmount2,
      );
    });
  });

  describe('getDonationSummary test cases', () => {
    it('should return an empty array if no donation summary exists', async () => {
      const summaries = await getDonationSummary(projectId);
      expect(summaries).to.be.an('array').that.is.empty;
    });

    it('should return the correct donation summary for a project', async () => {
      const donationAmount = 100;
      const donationUsdAmount = 150;

      await insertDonation({
        amount: donationAmount,
        valueUsd: donationUsdAmount,
      });
      // Create a donation summary
      await updateOrCreateDonationSummary(projectId);

      const summaries = await getDonationSummary(projectId);

      expect(summaries).to.have.lengthOf(1);
      expect(summaries[0].totalDonationAmount).to.equal(donationAmount);
      expect(summaries[0].totalDonationUsdAmount).to.equal(donationUsdAmount);
    });

    it('should return the correct donation summary for a specific early access round', async () => {
      const donationAmount = 100;
      const donationUsdAmount = 150;
      const earlyAccessRound1 = await EarlyAccessRound.create({
        roundNumber: 1,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-05'),
      }).save();

      await insertDonation({
        amount: donationAmount,
        valueUsd: donationUsdAmount,
        earlyAccessRoundId: earlyAccessRound1.id,
      });

      // Create a donation summary
      await updateOrCreateDonationSummary(
        projectId,
        null,
        earlyAccessRound1.id,
      );

      const summaries = await getDonationSummary(
        projectId,
        undefined,
        earlyAccessRound1.id,
      );

      expect(summaries).to.have.lengthOf(1);
      expect(summaries[0].totalDonationAmount).to.equal(donationAmount);
      expect(summaries[0].totalDonationUsdAmount).to.equal(donationUsdAmount);
    });
  });
});
