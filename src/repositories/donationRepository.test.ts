import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomTxHash,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { User, UserRole } from '../entities/user';
import { assert, expect } from 'chai';
import {
  countUniqueDonors,
  countUniqueDonorsForActiveQfRound,
  createDonation,
  findDonationById,
  findDonationsByTransactionId,
  findStableCoinDonationsWithoutPrice,
  getPendingDonationsIds,
  sumDonationValueUsd,
  sumDonationValueUsdForActiveQfRound,
} from './donationRepository';
import { updateOldStableCoinDonationsPrice } from '../services/donationService';
import { DONATION_STATUS } from '../entities/donation';
import moment from 'moment';
import { QfRound } from '../entities/qfRound';
import axios from 'axios';
import { fetchMultiFilterAllProjectsQuery } from '../../test/graphqlQueries';
import { Project } from '../entities/project';
import { getQfRoundTotalProjectsDonationsSum } from './qfRoundRepository';
import { calculateEstimateMatchingForProjectById } from '../services/qfRoundService';

describe('createDonation test cases', createDonationTestCases);

describe(
  'findDonationsByTransactionId() test cases',
  findDonationsByTransactionIdTestCases,
);
describe(
  'getPendingDonationsIds() test cases',
  getPendingDonationsIdsTestCases,
);
describe(
  'findStableCoinDonationsWithoutPrice() test cases',
  findStableCoinDonationsWithoutPriceTestCases,
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
describe('countUniqueDonors() test cases', countUniqueDonorsTestCases);
describe('sumDonationValueUsd() test cases', sumDonationValueUsdTestCases);
describe('estimatedMatching() test cases', estimatedMatchingTestCases);

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
      beginDate: new Date(),
      endDate: new Date(),
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
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
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
              { ...createDonationData(), valueUsd, qfRoundId: qfRound.id },
              userId,
              projectId,
            );
          }),
        );
      }),
    );

    const firstProjectMatch = await calculateEstimateMatchingForProjectById(
      firstProject.id,
    );
    const secondProjectMatch = await calculateEstimateMatchingForProjectById(
      secondProject.id,
    );

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
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
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
              { ...createDonationData(), valueUsd, qfRoundId: qfRound.id },
              userId,
              projectId,
            );
          }),
        );
      }),
    );

    const firstProjectMatch = await calculateEstimateMatchingForProjectById(
      firstProject.id,
    );
    const secondProjectMatch = await calculateEstimateMatchingForProjectById(
      secondProject.id,
    );

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
      generateRandomTxHash(),
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
  it('should not return donation with invalid id ', async () => {
    const fetchedDonation = await findDonationById(10000000);
    assert.isNotOk(fetchedDonation);
  });
}

function findStableCoinDonationsWithoutPriceTestCases() {
  it('should just return stable coin donations without price', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const donationData1 = createDonationData();
    delete donationData1.valueUsd;
    donationData1.currency = 'USDC';

    const donationData2 = createDonationData();
    donationData2.currency = 'USDC';

    const donationData3 = createDonationData();
    delete donationData3.valueUsd;
    donationData3.currency = 'USDT';

    const donationData4 = createDonationData();
    donationData4.currency = 'USDT';

    const donationData5 = createDonationData();
    delete donationData5.valueUsd;
    donationData5.currency = 'WXDAI';

    const donationData6 = createDonationData();
    donationData6.currency = 'WXDAI';

    const donationData7 = createDonationData();
    delete donationData7.valueUsd;
    donationData7.currency = 'XDAI';

    const donationData8 = createDonationData();
    donationData8.currency = 'XDAI';

    const donationData9 = createDonationData();
    delete donationData9.valueUsd;

    await saveDonationDirectlyToDb(donationData1, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData2, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData3, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData4, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData5, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData6, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData7, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData8, donor.id, project.id);
    await saveDonationDirectlyToDb(donationData9, donor.id, project.id);

    const donations = await findStableCoinDonationsWithoutPrice();
    assert.equal(donations.length, 4);
    assert.isOk(
      donations.find(
        donation => donation.transactionId === donationData1.transactionId,
      ),
    );
    assert.isOk(
      donations.find(
        donation => donation.transactionId === donationData3.transactionId,
      ),
    );
    assert.isOk(
      donations.find(
        donation => donation.transactionId === donationData5.transactionId,
      ),
    );
    assert.isOk(
      donations.find(
        donation => donation.transactionId === donationData7.transactionId,
      ),
    );

    await updateOldStableCoinDonationsPrice();

    // Shoud fill valuUsd of all stable coin donations
    const stableDonationsWithoutPrice =
      await findStableCoinDonationsWithoutPrice();
    assert.isEmpty(stableDonationsWithoutPrice);
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
      beginDate: new Date(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const donorCount = await countUniqueDonorsForActiveQfRound(project.id);

    assert.equal(donorCount, 0);

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
      beginDate: new Date(),
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

    const donorCount = await countUniqueDonorsForActiveQfRound(project.id);

    assert.equal(donorCount, 0);

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

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      beginDate: new Date(),
      endDate: new Date(),
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

    const donorCount = await countUniqueDonorsForActiveQfRound(project.id);

    assert.equal(donorCount, 1);

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
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      beginDate: new Date(),
      endDate: new Date(),
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

    const donorCount = await countUniqueDonorsForActiveQfRound(project.id);

    assert.equal(donorCount, 2);

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

    const donorCount = await countUniqueDonors(project.id);

    assert.equal(donorCount, 0);
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

    const donorCount = await countUniqueDonors(project.id);

    assert.equal(donorCount, 0);
  });
  it('should return correctly when there is one  donation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
      },
      donor.id,
      project.id,
    );

    const donorCount = await countUniqueDonors(project.id);
    assert.equal(donorCount, 1);
  });
  it('should return correctly when there is some donations', async () => {
    // 3 donations with 2 different donor
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

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

    const donorCount = await countUniqueDonors(project.id);

    assert.equal(donorCount, 2);
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
      beginDate: new Date(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const donationSum = await sumDonationValueUsdForActiveQfRound(project.id);

    assert.equal(donationSum, 0);

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
      beginDate: new Date(),
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

    const donationSum = await sumDonationValueUsdForActiveQfRound(project.id);

    assert.equal(donationSum, 0);

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

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      beginDate: new Date(),
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

    const donationSum = await sumDonationValueUsdForActiveQfRound(project.id);

    assert.equal(donationSum, valueUsd);

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
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      beginDate: new Date(),
      endDate: new Date(),
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

    const donationSum = await sumDonationValueUsdForActiveQfRound(project.id);

    assert.equal(donationSum, valueUsd1 + valueUsd2 + valueUsd3);

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

    const donationSum = await sumDonationValueUsd(project.id);
    assert.equal(donationSum, 0);
  });

  it('should not count unverified donations', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

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

    const donationSum = await sumDonationValueUsd(project.id);

    assert.equal(donationSum, valueUsd2);
  });

  it('should return correctly when there is some verified donation', async () => {
    // 3 donations with 2 different donor
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

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

    const donationSum = await sumDonationValueUsd(project.id);

    assert.equal(donationSum, valueUsd1 + valueUsd2 + valueUsd3);
  });
}
