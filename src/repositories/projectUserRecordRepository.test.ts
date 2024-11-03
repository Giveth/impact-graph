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
    });

    const amount = await getProjectUserRecordAmount({
      projectId: project.id,
      userId: user.id,
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
    });
    const ea2 = await saveEARoundDirectlyToDb({
      roundNumber: generateEARoundNumber(),
      startDate: new Date('2024-09-06'),
      endDate: new Date('2024-09-10'),
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test qf ',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: 'QF - 2024-09-10 - ' + generateQfRoundNumber(),
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

    const userRecord = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
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
    });

    assert.isOk(projectUserRecord);
    assert.equal(
      projectUserRecord.totalDonationAmount,
      donationAmount1 + donationAmount2,
    );
  });
});
