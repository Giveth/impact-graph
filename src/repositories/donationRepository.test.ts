import { assert } from 'chai';
import moment from 'moment';
import {
  createDonationData,
  createProjectData,
  deleteProjectDirectlyFromDb,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { User, UserRole } from '../entities/user';
import {
  countUniqueDonorsAndSumDonationValueUsd,
  createDonation,
  fillQfRoundDonationsUserScores,
  findDonationById,
  findDonationsByProjectIdWhichUseDonationBox,
  findDonationsByTransactionId,
  getPendingDonationsIds,
  getProjectQfRoundStats,
  isVerifiedDonationExistsInQfRound,
} from './donationRepository';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { QfRound } from '../entities/qfRound';
import { Project } from '../entities/project';
import { refreshProjectEstimatedMatchingView } from '../services/projectViewsService';
import { calculateEstimateMatchingForProjectById } from '../utils/qfUtils';

describe('createDonation test cases', createDonationTestCases);

describe(
  'findDonationsByTransactionId() test cases',
  findDonationsByTransactionIdTestCases,
);
describe(
  'getPendingDonationsIds() test cases',
  getPendingDonationsIdsTestCases,
);

describe('findDonationById() test cases', findDonationByIdTestCases);
describe(
  'countUniqueDonorsForActiveQfRound() test cases',
  countUniqueDonorsForActiveQfRoundTestCases,
);
describe(
  'sumDonationValueUsdForActiveQfRound() test cases',
  sumDonationValueUsdForActiveQfRoundTestCases,
);
describe(
  'fillQfRoundDonationsUserScores() test cases',
  fillQfRoundDonationsUserScoresTestCases,
);
describe('countUniqueDonors() test cases', countUniqueDonorsTestCases);
describe('sumDonationValueUsd() test cases', sumDonationValueUsdTestCases);
describe('estimatedMatching() test cases', estimatedMatchingTestCases);
describe(
  'isVerifiedDonationExistsInQfRound() test cases',
  isVerifiedDonationExistsInQfRoundTestCases,
);
describe('findDonationsToGiveth() test cases', findDonationsToGivethTestCases);

function fillQfRoundDonationsUserScoresTestCases() {
  let qfRound: QfRound;
  let qfRoundProject: Project;
  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().subtract(10, 'days').toDate(),
    });
    await qfRound.save();
    qfRoundProject = await saveProjectDirectlyToDb(createProjectData());
    qfRoundProject.qfRounds = [qfRound];
    await qfRoundProject.save();
  });

  it('should populate the qfRoundUserScore of the donation when the round ends and ignore non verified donations', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user1.passportScore = 12;
    await user1.save();

    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 10,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user1.id,
      qfRoundProject.id,
    );
    const donation2 = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 10,
        qfRoundId: qfRound.id,
        status: 'failed',
      },
      user1.id,
      qfRoundProject.id,
    );

    qfRound.isActive = false;
    await qfRound.save();
    await fillQfRoundDonationsUserScores();
    const updatedDonation = await Donation.findOne({
      where: { id: donation.id },
    });
    const updatedDonation2 = await Donation.findOne({
      where: { id: donation2.id },
    });

    assert.equal(updatedDonation?.qfRoundUserScore, user1.passportScore);
    assert.equal(updatedDonation2?.qfRoundUserScore, undefined);
  });
}

function estimatedMatchingTestCases() {
  let qfRound: QfRound;
  let firstProject: Project;
  let secondProject: Project;
  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    firstProject = await saveProjectDirectlyToDb(createProjectData());
    secondProject = await saveProjectDirectlyToDb(createProjectData());

    firstProject.qfRounds = [qfRound];
    secondProject.qfRounds = [qfRound];

    await firstProject.save();
    await secondProject.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return the correct matching distribution for two projects', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user1.passportScore = 12;
    await user1.save();
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user2.passportScore = 12;
    await user2.save();
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user3.passportScore = 12;
    await user3.save();
    const usersDonations: [number, number, number[]][] = [
      [user1.id, firstProject.id, [1, 3]], // 4
      [user1.id, secondProject.id, [4, 4 * 3]], // 16
      [user2.id, firstProject.id, [2, 23]], // 25
      [user2.id, secondProject.id, [4 * 2, 4 * 23]], // 25 * 4
      [user3.id, firstProject.id, [3, 97]], // 100
      [user3.id, secondProject.id, [3 * 4, 97 * 4]], // 100 * 4
    ];

    await Promise.all(
      usersDonations.map(([userId, projectId, valuesUsd]) => {
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              userId,
              projectId,
            );
          }),
        );
      }),
    );

    await refreshProjectEstimatedMatchingView();

    const firstProjectMatch = await calculateEstimateMatchingForProjectById({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    const secondProjectMatch = await calculateEstimateMatchingForProjectById({
      projectId: secondProject.id,
      qfRoundId: qfRound.id,
    });

    // the sum of the matchs of each project according to its donations should equal the
    // allocated funds of the round.
    // Both have same amount of donations, so in this case bigger donations generate more matching
    assert.equal(
      firstProjectMatch! + secondProjectMatch!,
      qfRound.allocatedFund,
    );
    assert.isTrue(secondProjectMatch! > firstProjectMatch!);
  });

  it('should return the higher matching for a project with more donations', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user1.passportScore = 12;
    await user1.save();
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user2.passportScore = 12;
    await user2.save();
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user3.passportScore = 12;
    await user3.save();
    // REMOVED from second project 2 donations
    const usersDonations: [number, number, number[]][] = [
      [user1.id, firstProject.id, [1, 3]], // 4
      [user1.id, secondProject.id, [4, 4 * 3]], // 16
      [user2.id, firstProject.id, [2, 23]], // 25
      [user2.id, secondProject.id, [4 * 2, 4 * 23]], // 25 * 4
      [user3.id, firstProject.id, [3, 97]], // 100
    ];

    await Promise.all(
      usersDonations.map(([userId, projectId, valuesUsd]) => {
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              userId,
              projectId,
            );
          }),
        );
      }),
    );

    await refreshProjectEstimatedMatchingView();

    const firstProjectMatch = await calculateEstimateMatchingForProjectById({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    const secondProjectMatch = await calculateEstimateMatchingForProjectById({
      projectId: secondProject.id,
      qfRoundId: qfRound.id,
    });

    // the sum of the matchs of each project according to its donations should equal the
    // allocated funds of the round.
    // AS the first project has more support by having 2 more donations
    // The matching will be higher even if the donations are smaller in amount
    assert.equal(
      firstProjectMatch! + secondProjectMatch!,
      qfRound.allocatedFund,
    );
    assert.isTrue(secondProjectMatch! < firstProjectMatch!);
  });
}

function findDonationsByTransactionIdTestCases() {
  it('should return donation with txHash ', async () => {
    const donation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    const fetchedDonation = await findDonationsByTransactionId(
      donation.transactionId,
    );
    assert.isOk(fetchedDonation);
    assert.equal(fetchedDonation?.id, donation.id);
  });
  it('should return donation with lowercase txHash ', async () => {
    const donation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    const fetchedDonation = await findDonationsByTransactionId(
      donation.transactionId.toLowerCase(),
    );
    assert.isOk(fetchedDonation);
    assert.equal(fetchedDonation?.id, donation.id);
  });
  it('should return donation with uppercase txHash ', async () => {
    const donation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    const fetchedDonation = await findDonationsByTransactionId(
      donation.transactionId.toUpperCase(),
    );
    assert.isOk(fetchedDonation);
    assert.equal(fetchedDonation?.id, donation.id);
  });
  it('should not return donation with invalid txHash ', async () => {
    const fetchedDonation = await findDonationsByTransactionId(
      generateRandomEvmTxHash(),
    );
    assert.isNotOk(fetchedDonation);
  });
}

function findDonationByIdTestCases() {
  it('should return donation with id ', async () => {
    const donation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    const fetchedDonation = await findDonationById(donation.id);
    assert.isOk(fetchedDonation);
    assert.equal(fetchedDonation?.id, donation.id);
    assert.isOk(fetchedDonation?.project);
    assert.equal(fetchedDonation?.project.id, SEED_DATA.FIRST_PROJECT.id);
  });
  it('should return donation with id, join with qfRound ', async () => {
    const qfRound = QfRound.create({
      isActive: false,
      name: new Date().getTime().toString(),
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donation = await saveDonationDirectlyToDb(
      createDonationData(),
      user.id,
      project.id,
    );
    donation.qfRound = qfRound;
    await donation.save();
    const fetchedDonation = await findDonationById(donation.id);
    assert.isOk(fetchedDonation);
    assert.equal(fetchedDonation?.id, donation.id);
    assert.isOk(fetchedDonation?.project);
    assert.equal(fetchedDonation?.project.id, project.id);
    assert.equal(fetchedDonation?.qfRound.id, qfRound.id);
  });
  it('should not return donation with invalid id ', async () => {
    const fetchedDonation = await findDonationById(10000000);
    assert.isNotOk(fetchedDonation);
  });
}

function createDonationTestCases() {
  it('should create donation ', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donationData = createDonationData();
    const walletAddress = generateRandomEtheriumAddress();
    donationData.toWalletAddress = walletAddress;
    donationData.projectId = project.id;
    const newDonation = await createDonation({
      donationAnonymous: false,
      donorUser: user,
      isProjectVerified: false,
      isTokenEligibleForGivback: false,
      project,
      segmentNotified: false,
      tokenAddress: '',
      transakId: '',
      transactionId: '9151faa1-e69b-4a36-b959-3c4f894afb68',
      transactionNetworkId: 10,
      toWalletAddress: '134',
      fromWalletAddress: '134',
      amount: 10,
      token: 'jgjbjbkjbnjknb',
    });
    assert.isOk(newDonation);
    assert.equal(newDonation.projectId, project.id);
  });
}

function getPendingDonationsIdsTestCases() {
  it('should return pending donations in last 48 hours', async () => {
    const pendingDonations = await getPendingDonationsIds();

    const project = await saveProjectDirectlyToDb(createProjectData());
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const newDonation = await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.PENDING,
      }),
      donor.id,
      project.id,
    );

    const oldDonation = await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.PENDING,
        createdAt: moment()
          .subtract({
            hours:
              Number(process.env.DONATION_VERIFICAITON_EXPIRATION_HOURS) + 1,
          })
          .toDate(),
      }),
      donor.id,
      project.id,
    );
    const oldDonation2 = await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.PENDING,
        createdAt: moment()
          .subtract({
            hours:
              Number(process.env.DONATION_VERIFICAITON_EXPIRATION_HOURS) + 2,
          })
          .toDate(),
      }),
      donor.id,
      project.id,
    );
    const newPendingDonations = await getPendingDonationsIds();

    assert.equal(newPendingDonations.length, pendingDonations.length + 1);
    assert.isOk(
      newPendingDonations.find(donation => donation.id === newDonation.id),
    );
    assert.notOk(
      newPendingDonations.find(donation => donation.id === oldDonation.id),
    );
    assert.notOk(
      newPendingDonations.find(donation => donation.id === oldDonation2.id),
    );
  });
}

function countUniqueDonorsForActiveQfRoundTestCases() {
  it('should return zero when project has no qfRound donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const donorCount = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(donorCount.uniqueDonorsCount, 0);

    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should not count unverified and notqfRound donations', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    // not verified
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'pending',
        qfRoundId: qfRound.id,
      },
      donor.id,
      project.id,
    );

    // not qfRound
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
      },
      donor.id,
      project.id,
    );

    const donorCount = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(donorCount.uniqueDonorsCount, 0);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return not count donations after qfRound.endDate', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor.passportScore = 13;
    await donor.save();

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment().subtract(3, 'days').toDate(),
      endDate: moment().subtract(1, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor.id,
      project.id,
    );

    const donorCount = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(donorCount.uniqueDonorsCount, 0);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return correctly when there is one qfRound donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor.passportScore = 13;
    await donor.save();

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor.id,
      project.id,
    );

    await refreshProjectEstimatedMatchingView();

    const donorCount = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(donorCount.uniqueDonorsCount, 1);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return correctly when there is some qfRound donation', async () => {
    // 3 donations with 2 different donor
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor1.passportScore = 13;
    await donor1.save();
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor2.passportScore = 13;
    await donor2.save();

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor1.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor1.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor2.id,
      project.id,
    );

    await refreshProjectEstimatedMatchingView();

    const donorCount = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(donorCount.uniqueDonorsCount, 2);

    qfRound.isActive = false;
    await qfRound.save();
  });
}

function countUniqueDonorsTestCases() {
  it('should return zero when project has no donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const { uniqueDonors } = await countUniqueDonorsAndSumDonationValueUsd(
      project.id,
    );
    assert.equal(uniqueDonors, 0);
  });

  it('should not count unverified donations', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    // not verified
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'pending',
      },
      donor.id,
      project.id,
    );

    const { uniqueDonors } = await countUniqueDonorsAndSumDonationValueUsd(
      project.id,
    );

    assert.equal(uniqueDonors, 0);
  });
  it('should return correctly when there is one  donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor.passportScore = 13;
    await donor.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
      },
      donor.id,
      project.id,
    );

    await refreshProjectEstimatedMatchingView();

    const { uniqueDonors } = await countUniqueDonorsAndSumDonationValueUsd(
      project.id,
    );
    assert.equal(uniqueDonors, 1);
  });
  it('should return correctly when there is some donations', async () => {
    // 3 donations with 2 different donor
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor1.passportScore = 13;
    await donor1.save();
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor2.passportScore = 13;
    await donor2.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
      },
      donor1.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
      },
      donor1.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
      },
      donor2.id,
      project.id,
    );

    await refreshProjectEstimatedMatchingView();

    const { uniqueDonors } = await countUniqueDonorsAndSumDonationValueUsd(
      project.id,
    );

    assert.equal(uniqueDonors, 2);
  });
}

function sumDonationValueUsdForActiveQfRoundTestCases() {
  it('should return zero when project has no qfRound donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const { sumValueUsd } = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(sumValueUsd, 0);

    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should not count unverified and not qfRound donations', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor.passportScore = 13;
    await donor.save();

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    const valueUsd = 100;
    // not verified
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'pending',
        qfRoundId: qfRound.id,
        valueUsd,
      },
      donor.id,
      project.id,
    );

    // not qfRound
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd,
      },
      donor.id,
      project.id,
    );

    const donationSum = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(donationSum.uniqueDonorsCount, 0);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should not count donors that have less than minimum passport score', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor.passportScore = 8;
    await donor.save();
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    const valueUsd = 100;
    // not verified
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
        valueUsd,
      },
      donor.id,
      project.id,
    );

    await refreshProjectEstimatedMatchingView();

    const { uniqueDonorsCount } = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(uniqueDonorsCount, 0);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should not count donations usd values when donors have less than minimum passport score', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor.passportScore = 7;
    await donor.save();
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    const valueUsd = 100;
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
        valueUsd,
      },
      donor.id,
      project.id,
    );

    const { sumValueUsd } = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(sumValueUsd, 0);

    const { totalDonations } = await countUniqueDonorsAndSumDonationValueUsd(
      project.id,
    );
    assert.equal(totalDonations, valueUsd);

    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return correctly when there is one qfRound donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor.passportScore = 13;
    await donor.save();

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const valueUsd = 100;
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
        valueUsd,
      },
      donor.id,
      project.id,
    );

    await refreshProjectEstimatedMatchingView();
    const { sumValueUsd } = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(sumValueUsd, valueUsd);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return correctly when there is some qfRound donation', async () => {
    // 3 donations with 2 different donor
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor1.passportScore = 13;
    await donor1.save();
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor2.passportScore = 13;
    await donor2.save();

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const valueUsd1 = 100;
    const valueUsd2 = 200;
    const valueUsd3 = 300;

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
        valueUsd: valueUsd1,
      },
      donor1.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
        valueUsd: valueUsd2,
      },
      donor1.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
        valueUsd: valueUsd3,
      },
      donor2.id,
      project.id,
    );

    await refreshProjectEstimatedMatchingView();

    const { sumValueUsd } = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });

    assert.equal(sumValueUsd, valueUsd1 + valueUsd2 + valueUsd3);

    qfRound.isActive = false;
    await qfRound.save();
  });
}

function sumDonationValueUsdTestCases() {
  it('should return zero when project has no  donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const { totalDonations } = await countUniqueDonorsAndSumDonationValueUsd(
      project.id,
    );
    assert.equal(totalDonations, 0);
  });

  it('should not count unverified donations', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor.passportScore = 13;
    await donor.save();

    const valueUsd1 = 100;
    const valueUsd2 = 50;
    // not verified
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'pending',
        valueUsd: valueUsd1,
      },
      donor.id,
      project.id,
    );

    // not qfRound
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: valueUsd2,
      },
      donor.id,
      project.id,
    );

    await refreshProjectEstimatedMatchingView();

    const { totalDonations } = await countUniqueDonorsAndSumDonationValueUsd(
      project.id,
    );

    assert.equal(totalDonations, valueUsd2);
  });

  it('should return correctly when there is some verified donation', async () => {
    // 3 donations with 2 different donor
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor1.passportScore = 13;
    await donor1.save();
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor2.passportScore = 13;
    await donor2.save();

    const valueUsd1 = 100;
    const valueUsd2 = 200;
    const valueUsd3 = 300;

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: valueUsd1,
      },
      donor1.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: valueUsd2,
      },
      donor1.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: valueUsd3,
      },
      donor2.id,
      project.id,
    );

    await refreshProjectEstimatedMatchingView();

    const { totalDonations } = await countUniqueDonorsAndSumDonationValueUsd(
      project.id,
    );

    assert.equal(totalDonations, valueUsd1 + valueUsd2 + valueUsd3);
  });
}

function isVerifiedDonationExistsInQfRoundTestCases() {
  it('should return true when there is a verified donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor.id,
      project.id,
    );
    const doesExist = await isVerifiedDonationExistsInQfRound({
      projectId: project.id,
      qfRoundId: qfRound.id,
      userId: donor.id,
    });
    assert.isTrue(doesExist);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return false when there is a non-verified donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'pending',
        qfRoundId: qfRound.id,
      },
      donor.id,
      project.id,
    );
    const doesExist = await isVerifiedDonationExistsInQfRound({
      projectId: project.id,
      qfRoundId: qfRound.id,
      userId: donor.id,
    });
    assert.isFalse(doesExist);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return false when sending invalid userId', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor.id,
      project.id,
    );
    const doesExist = await isVerifiedDonationExistsInQfRound({
      projectId: project.id,
      qfRoundId: qfRound.id,
      userId: 999999,
    });
    assert.isFalse(doesExist);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return false when sending invalid projectId', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor.id,
      project.id,
    );
    const doesExist = await isVerifiedDonationExistsInQfRound({
      projectId: 9999900,
      qfRoundId: qfRound.id,
      userId: donor.id,
    });
    assert.isFalse(doesExist);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return false when sending invalid qfRoundId', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor.id,
      project.id,
    );
    const doesExist = await isVerifiedDonationExistsInQfRound({
      projectId: project.id,
      qfRoundId: 9999999,
      userId: donor.id,
    });
    assert.isFalse(doesExist);

    qfRound.isActive = false;
    await qfRound.save();
  });
}

function findDonationsToGivethTestCases() {
  it('should return giveth donations correctly', async () => {
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const donation1 = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        projectId: project1.id,
        createdAt: new Date(),
        relevantDonationTxHash: 'tx1',
        useDonationBox: true,
      },
      user.id,
      project1.id,
    );

    const donation2 = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        projectId: project2.id,
        createdAt: new Date(),
        transactionId: 'tx1',
        useDonationBox: true,
      },
      user.id,
      project2.id,
    );

    const donationsToGiveth = await findDonationsByProjectIdWhichUseDonationBox(
      new Date('2023-01-01'),
      new Date(),
      project1.id,
    );

    assert.equal(donationsToGiveth.length, 1);
    assert.equal(donationsToGiveth[0].id, donation1.id);

    // Clean up
    await Donation.remove([donation1, donation2]);
    await deleteProjectDirectlyFromDb(project1.id);
    await deleteProjectDirectlyFromDb(project2.id);
    await User.remove(user);
  });
}
