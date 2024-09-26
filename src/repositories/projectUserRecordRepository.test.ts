import { assert } from 'chai';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  getProjectUserRecordAmount,
  updateOrCreateProjectUserRecord,
} from './projectUserRecordRepository';
import { DONATION_STATUS } from '../entities/donation';

describe('projectUserRecordRepository', () => {
  let project;
  let user;

  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());
    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  });

  it('should return 0 when there is no donation', async () => {
    const projectUserRecord = await updateOrCreateProjectUserRecord({
      projectId: project.id,
      userId: user.id,
    });

    assert.isOk(projectUserRecord);
    assert.equal(projectUserRecord.totalDonationAmount, 0);
  });

  it('should return the total verified donation amount', async () => {
    const verifiedDonationAmount1 = 100;
    const verifiedDonationAmount2 = 200;
    const unverifiedDonationAmount = 300;

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: verifiedDonationAmount1,
        status: DONATION_STATUS.VERIFIED,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: verifiedDonationAmount2,
        status: DONATION_STATUS.VERIFIED,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: unverifiedDonationAmount,
        status: DONATION_STATUS.PENDING,
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
      verifiedDonationAmount1 + verifiedDonationAmount2,
    );
  });

  it('should return the total verified donation amount for a specific project', async () => {
    const verifiedDonationAmount1 = 100;
    const verifiedDonationAmount2 = 200;
    const unverifiedDonationAmount = 300;

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: verifiedDonationAmount1,
        status: DONATION_STATUS.VERIFIED,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: verifiedDonationAmount2,
        status: DONATION_STATUS.VERIFIED,
      },
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: unverifiedDonationAmount,
        status: DONATION_STATUS.PENDING,
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

    assert.equal(amount, verifiedDonationAmount1 + verifiedDonationAmount2);
  });
});
