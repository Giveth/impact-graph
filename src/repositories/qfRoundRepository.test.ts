import {
  createDonationData,
  createProjectData,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { expect } from 'chai';
import { getProjectDonationsSqrtRootSum } from './qfRoundRepository';
import { Project } from '../entities/project';

describe(
  'getProjectDonationsSqrtRootSum test cases',
  getProjectDonationsSqrRootSumTests,
);
function getProjectDonationsSqrRootSumTests() {
  let qfRound: QfRound;
  let project: Project;
  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      beginDate: new Date(),
      endDate: new Date(),
    });
    await qfRound.save();
    project = await saveProjectDirectlyToDb(createProjectData());
    project.qfRounds = [qfRound];
    await project.save();
  });

  it('should return 0 when no donations', async () => {
    const donationsSqrtRootSum = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    expect(donationsSqrtRootSum).to.equal(0);
  });

  it('should return correct value on single donation', async () => {
    const donation = await saveDonationDirectlyToDb(
      { ...createDonationData(), valueUsd: 100, qfRoundId: qfRound.id },
      SEED_DATA.FIRST_USER.id,
      project.id,
    );

    const donationsSqrtRootSum = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    expect(donationsSqrtRootSum).to.equal(10);
  });

  it('should return correct value on multiple donations', async () => {
    const valuesUsd = [4, 25, 100, 1024];
    const donations = await Promise.all(
      valuesUsd.map(valueUsd => {
        return saveDonationDirectlyToDb(
          { ...createDonationData(), valueUsd, qfRoundId: qfRound.id },
          SEED_DATA.FIRST_USER.id,
          project.id,
        );
      }),
    );

    const donationsSqrtRootSum = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) + sqrt(1024) = 2 + 5 + 10 + 32 = 49
    const expectedSum = 49;

    expect(donationsSqrtRootSum).to.equal(expectedSum);
  });
}
