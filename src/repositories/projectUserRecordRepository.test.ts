import { assert } from 'chai';
import moment from 'moment';
import {
  createDonationData,
  createProjectData,
  generateEARoundNumber,
  generateQfRoundNumber,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveEARoundDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  getProjectUserRecordAmount,
  updateOrCreateProjectUserRecord,
} from './projectUserRecordRepository';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { QfRound } from '../entities/qfRound';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { User } from '../entities/user';
import qAccService from '../services/qAccService';

describe('projectUserRecordRepository', () => {
  let project;
  let user;
  let eaRound;

  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());
    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    eaRound = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      seasonNumber: 1,
    });
  });

  afterEach(async () => {
    if (eaRound) {
      Donation.delete({ earlyAccessRoundId: eaRound.id });
      ProjectRoundRecord.delete({ earlyAccessRoundId: eaRound.id });

      await eaRound.remove();
      eaRound = null;
    }
  });

  it('should return 0 when there is no donation', async () => {
    const projectUserRecord = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    assert.isOk(projectUserRecord);
    assert.equal(projectUserRecord.totalDonationAmount, 0);
  });

  it('should return the total verified and pending donation amount', async () => {
    const verifiedDonationAmount = 100;
    const pendingDonationAmount = 200;
    const faildDonationAmount = 300;

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: verifiedDonationAmount,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: eaRound.id,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: pendingDonationAmount,
        status: DONATION_STATUS.PENDING,
        earlyAccessRoundId: eaRound.id,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: faildDonationAmount,
        status: DONATION_STATUS.FAILED,
        earlyAccessRoundId: eaRound.id,
      },
      user.id,
      project.id,
    );

    const projectUserRecord = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    assert.isOk(projectUserRecord);
    assert.equal(
      projectUserRecord.totalDonationAmount,
      verifiedDonationAmount + pendingDonationAmount,
    );
  });

  it('should return the total verified and pending donation amount for a specific project', async () => {
    const verifiedDonationAmount = 100;
    const pendingDonationAmount = 200;
    const failedDonationAmount = 300;

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: verifiedDonationAmount,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: eaRound.id,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: pendingDonationAmount,
        status: DONATION_STATUS.PENDING,
        earlyAccessRoundId: eaRound.id,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: failedDonationAmount,
        status: DONATION_STATUS.FAILED,
        earlyAccessRoundId: eaRound.id,
      },
      user.id,
      project.id,
    );

    await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    const amount = await getProjectUserRecordAmount({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    assert.equal(
      amount.totalDonationAmount,
      verifiedDonationAmount + pendingDonationAmount,
    );
  });

  it('should return correct ea and qf donation amounts', async () => {
    const ea1 = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      seasonNumber: 1,
    });
    const ea2 = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-06'),
      endDate: new Date('2024-09-10'),
      seasonNumber: 1,
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test qf ',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: 'QF - 2024-09-10 - ' + generateQfRoundNumber(),
      beginDate: moment('2024-09-10').add(1, 'days').toDate(),
      endDate: moment('2024-09-10').add(10, 'days').toDate(),
      seasonNumber: 1,
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

    const userRecord = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    assert.isOk(userRecord);
    assert.equal(
      userRecord.eaTotalDonationAmount,
      ea1DonationAmount + ea2DonationAmount,
    );
    assert.equal(userRecord.qfTotalDonationAmount, qfDonationAmount);
    assert.equal(
      userRecord.totalDonationAmount,
      ea1DonationAmount + ea2DonationAmount + qfDonationAmount,
    );
  });

  it('should update record if it already exists', async () => {
    const donationAmount1 = 100;
    const donationAmount2 = 200;

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: donationAmount1,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: eaRound.id,
      },
      user.id,
      project.id,
    );

    let projectUserRecord = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    assert.isOk(projectUserRecord);
    assert.equal(projectUserRecord.totalDonationAmount, donationAmount1);

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: donationAmount2,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: eaRound.id,
      },
      user.id,
      project.id,
    );

    projectUserRecord = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    assert.isOk(projectUserRecord);
    assert.equal(
      projectUserRecord.totalDonationAmount,
      donationAmount1 + donationAmount2,
    );
  });

  it('should reset individual caps for each season', async () => {
    // Season 1 donations
    const season1EaRound = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      seasonNumber: 1,
    });

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 500,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: season1EaRound.id,
      },
      user.id,
      project.id,
    );

    const season1Record = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    assert.equal(season1Record.totalDonationAmount, 500);

    // Season 2 donations - should start fresh
    const season2EaRound = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-05'),
      seasonNumber: 2,
    });

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 700,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: season2EaRound.id,
      },
      user.id,
      project.id,
    );

    const season2Record = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 2,
    });

    // Verify season 2 record is independent of season 1
    assert.equal(season2Record.totalDonationAmount, 700);

    // Verify season 1 record remains unchanged
    const season1RecordAgain = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });
    assert.equal(season1RecordAgain.totalDonationAmount, 500);
  });

  it('should share caps between EA and QF rounds in the same season', async () => {
    // Create EA round in season 1
    const season1EaRound = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      seasonNumber: 1,
      roundPOLCapPerUserPerProject: 1500, // Individual cap of 1500 POL
    });

    // Create QF round in season 1
    const season1QfRound = await QfRound.create({
      isActive: true,
      name: 'Season 1 QF',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: 'QF-S1-' + generateQfRoundNumber(),
      beginDate: moment('2024-09-10').toDate(),
      endDate: moment('2024-09-20').toDate(),
      seasonNumber: 1,
      roundPOLCapPerUserPerProject: 1500, // Individual cap of 1500 POL
    }).save();

    // Make EA round donation
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 500,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: season1EaRound.id,
      },
      user.id,
      project.id,
    );

    // Make QF round donation
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 700,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: season1QfRound.id,
      },
      user.id,
      project.id,
    );

    // Verify total donations for season 1 includes both EA and QF
    const season1Record = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    assert.equal(season1Record.totalDonationAmount, 1200); // 500 + 700
    assert.equal(season1Record.eaTotalDonationAmount, 500);
    assert.equal(season1Record.qfTotalDonationAmount, 700);
  });

  it('should track EA and QF donations separately while sharing season cap', async () => {
    // Create EA round in season 1
    const season1EaRound = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      seasonNumber: 1,
      roundPOLCapPerUserPerProject: 1000, // Individual cap of 1000 POL for EA
    });

    // Create QF round in season 1
    const season1QfRound = await QfRound.create({
      isActive: true,
      name: 'Season 1 QF',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: 'QF-S1-' + generateQfRoundNumber(),
      beginDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
      seasonNumber: 1,
      roundPOLCapPerUserPerProject: 1500,
      roundPOLCapPerUserPerProjectWithGitcoinScoreOnly: 2000,
    }).save();

    // Make EA round donations
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 800,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: season1EaRound.id,
      },
      user.id,
      project.id,
    );

    // Make QF round donations - should have separate cap tracking
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 1200,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: season1QfRound.id,
      },
      user.id,
      project.id,
    );

    const season1Record = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    // Verify EA and QF donations are tracked separately
    assert.equal(season1Record.eaTotalDonationAmount, 800);
    assert.equal(season1Record.qfTotalDonationAmount, 1200);
    assert.equal(season1Record.totalDonationAmount, 2000);

    // Verify that remaining Gitcoin score cap only considers QF donations
    const mockUser = {
      id: user.id,
      passportScore: 10,
      analysisScore: 10,
      passportScoreUpdateTimestamp: new Date(),
      hasEnoughGitcoinAnalysisScore: true,
      hasEnoughGitcoinPassportScore: true,
      privadoVerified: false,
    };

    const remainingGitcoinCap =
      await qAccService.getUserRemainedCapBasedOnGitcoinScore({
        projectId: project.id,
        user: mockUser as User,
      });

    // Should be 2000 (Gitcoin cap) - 1200 (QF donations) = 800
    // EA donations (800) should not affect this calculation
    assert.equal(remainingGitcoinCap, 800);
  });

  it('should handle pending and verified donations in season totals', async () => {
    // Create EA round in season 1
    const season1EaRound = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      seasonNumber: 1,
    });

    // Create QF round in season 1
    const season1QfRound = await QfRound.create({
      isActive: true,
      name: 'Season 1 QF',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: 'QF-S1-' + generateQfRoundNumber(),
      beginDate: moment('2024-09-10').toDate(),
      endDate: moment('2024-09-20').toDate(),
      seasonNumber: 1,
    }).save();

    // Add verified and pending donations for EA round
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 300,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: season1EaRound.id,
      },
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 200,
        status: DONATION_STATUS.PENDING,
        earlyAccessRoundId: season1EaRound.id,
      },
      user.id,
      project.id,
    );

    // Add verified and pending donations for QF round
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 400,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: season1QfRound.id,
      },
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 100,
        status: DONATION_STATUS.PENDING,
        qfRoundId: season1QfRound.id,
      },
      user.id,
      project.id,
    );

    // Add a failed donation that should not be counted
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 1000,
        status: DONATION_STATUS.FAILED,
        qfRoundId: season1QfRound.id,
      },
      user.id,
      project.id,
    );

    const season1Record = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    // Verify that both verified and pending donations are included, but failed ones are not
    assert.equal(season1Record.eaTotalDonationAmount, 500); // 300 verified + 200 pending
    assert.equal(season1Record.qfTotalDonationAmount, 500); // 400 verified + 100 pending
    assert.equal(season1Record.totalDonationAmount, 1000); // Total including both verified and pending
  });

  it('should track EA and QF round caps independently', async () => {
    // Create EA round in season 1
    const season1EaRound = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      seasonNumber: 1,
      roundPOLCapPerUserPerProject: 1000, // Individual cap of 1000 POL for EA
    });

    // Create QF round in season 1
    const season1QfRound = await QfRound.create({
      isActive: true,
      name: 'Season 1 QF',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: 'QF-S1-' + generateQfRoundNumber(),
      beginDate: moment('2024-09-10').toDate(),
      endDate: moment('2024-09-20').toDate(),
      seasonNumber: 1,
      roundPOLCapPerUserPerProject: 1500, // Individual cap of 1500 POL for QF
    }).save();

    // Make EA round donations up to its cap
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 600,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: season1EaRound.id,
      },
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 400,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: season1EaRound.id,
      },
      user.id,
      project.id,
    );

    // Make QF round donations - should not be affected by EA donations
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 800,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: season1QfRound.id,
      },
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 500,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: season1QfRound.id,
      },
      user.id,
      project.id,
    );

    const season1Record = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    // Verify EA and QF donations are tracked separately
    assert.equal(season1Record.eaTotalDonationAmount, 1000); // EA cap reached
    assert.equal(season1Record.qfTotalDonationAmount, 1300); // QF donations independent of EA
    assert.equal(season1Record.totalDonationAmount, 2300); // Total includes both but caps are separate
  });

  it('should handle Gitcoin score caps independently for QF rounds', async () => {
    // Create EA round in season 1
    const season1EaRound = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      seasonNumber: 1,
      roundPOLCapPerUserPerProject: 1000,
    });

    // Create QF round in season 1 with Gitcoin score cap
    const season1QfRound = await QfRound.create({
      isActive: true,
      name: 'Season 1 QF',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: 'QF-S1-' + generateQfRoundNumber(),
      beginDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
      seasonNumber: 1,
      roundPOLCapPerUserPerProject: 1500,
      roundPOLCapPerUserPerProjectWithGitcoinScoreOnly: 2000,
    }).save();

    // Make EA round donations
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 800,
        status: DONATION_STATUS.VERIFIED,
        earlyAccessRoundId: season1EaRound.id,
      },
      user.id,
      project.id,
    );

    // Make QF round donations - should have separate cap tracking
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 1200,
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: season1QfRound.id,
      },
      user.id,
      project.id,
    );

    const season1Record = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
      seasonNumber: 1,
    });

    // Verify EA and QF donations are tracked separately
    assert.equal(season1Record.eaTotalDonationAmount, 800);
    assert.equal(season1Record.qfTotalDonationAmount, 1200);
    assert.equal(season1Record.totalDonationAmount, 2000);

    // Verify that remaining Gitcoin score cap only considers QF donations
    const mockUser = {
      id: user.id,
      passportScore: 10,
      analysisScore: 10,
      passportScoreUpdateTimestamp: new Date(),
      hasEnoughGitcoinAnalysisScore: true,
      hasEnoughGitcoinPassportScore: true,
      privadoVerified: false,
    };

    const remainingGitcoinCap =
      await qAccService.getUserRemainedCapBasedOnGitcoinScore({
        projectId: project.id,
        user: mockUser as User,
      });

    // Should be 2000 (Gitcoin cap) - 1200 (QF donations) = 800
    // EA donations (800) should not affect this calculation
    assert.equal(remainingGitcoinCap, 800);
  });
});
