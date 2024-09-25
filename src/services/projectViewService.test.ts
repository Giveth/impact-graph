import moment from 'moment';
import { assert } from 'chai';
import {
  getQfRoundActualDonationDetails,
  refreshProjectActualMatchingView,
} from './projectViewsService';
import { QfRound } from '../entities/qfRound';
import { Project } from '../entities/project';
import { NETWORK_IDS } from '../provider';
import {
  createDonationData,
  createProjectData,
  generateQfRoundNumber,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';

describe(
  'getQfRoundActualDonationDetails test cases',
  getQfRoundActualDonationDetailsTestCases,
);

function getQfRoundActualDonationDetailsTestCases() {
  let qfRound: QfRound;
  let project: Project;

  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      roundNumber: generateQfRoundNumber(),
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      minimumValidUsdValue: 1,
      slug: new Date().getTime().toString(),
      eligibleNetworks: [
        NETWORK_IDS.XDAI,
        NETWORK_IDS.OPTIMISTIC,
        NETWORK_IDS.POLYGON,
        NETWORK_IDS.MAIN_NET,
      ],
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    project = await saveProjectDirectlyToDb(createProjectData());
    project.qfRounds = [qfRound];
    await project.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should not be greater than qfRound maximum reward ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.passportScore = qfRound.minimumPassportScore;
    await user.save();
    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: 100,
        qfRoundId: qfRound.id,
        qfRoundUserScore: user.passportScore,
      },
      user.id,
      project.id,
    );
    await refreshProjectActualMatchingView();

    const actualDonationDetails = (
      await getQfRoundActualDonationDetails(qfRound.id)
    )[0];
    assert.equal(actualDonationDetails.allUsdReceived, donation.valueUsd);

    // The maximum reward is 20% of the allocated fund (100)
    assert.equal(actualDonationDetails.realMatchingFund, 20);
  });
  it('5 projects with same donations should get same weight and real matching fund ', async () => {
    const qfr = QfRound.create({
      roundNumber: generateQfRoundNumber(),
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      minimumValidUsdValue: 1,
      slug: new Date().getTime().toString(),
      eligibleNetworks: [
        NETWORK_IDS.XDAI,
        NETWORK_IDS.OPTIMISTIC,
        NETWORK_IDS.POLYGON,
        NETWORK_IDS.MAIN_NET,
      ],
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfr.save();
    for (let i = 0; i < 5; i++) {
      const p = await saveProjectDirectlyToDb(createProjectData());
      p.qfRounds = [qfr];
      await p.save();
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.passportScore = qfr.minimumPassportScore;
      await user.save();

      await saveDonationDirectlyToDb(
        {
          ...createDonationData(),
          status: 'verified',
          valueUsd: 100,
          qfRoundId: qfr.id,
          qfRoundUserScore: user.passportScore,
        },
        user.id,
        p.id,
      );
    }

    await refreshProjectActualMatchingView();
    const actualMatchingFundData = await getQfRoundActualDonationDetails(
      qfr.id,
    );
    assert.equal(actualMatchingFundData.length, 5);

    // The maximum reward is 20% of the allocated fund (100)
    assert.equal(actualMatchingFundData[0].realMatchingFund, 20);
    assert.equal(actualMatchingFundData[1].realMatchingFund, 20);
    assert.equal(actualMatchingFundData[2].realMatchingFund, 20);
    assert.equal(actualMatchingFundData[3].realMatchingFund, 20);
    assert.equal(actualMatchingFundData[4].realMatchingFund, 20);
    await QfRound.update({}, { isActive: false });
  });

  it('Weight should be calculated correct when project have different donations', async () => {
    const qfr = QfRound.create({
      roundNumber: generateQfRoundNumber(),
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      minimumValidUsdValue: 1,
      slug: new Date().getTime().toString(),
      eligibleNetworks: [
        NETWORK_IDS.XDAI,
        NETWORK_IDS.OPTIMISTIC,
        NETWORK_IDS.POLYGON,
        NETWORK_IDS.MAIN_NET,
      ],
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfr.save();

    const p = await saveProjectDirectlyToDb(createProjectData());
    p.qfRounds = [qfr];
    await p.save();
    const u = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    u.passportScore = qfr.minimumPassportScore;
    await u.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: 2,
        qfRoundId: qfr.id,
        qfRoundUserScore: u.passportScore,
      },
      u.id,
      p.id,
    );

    for (let i = 0; i < 5; i++) {
      const newProject = await saveProjectDirectlyToDb(createProjectData());
      newProject.qfRounds = [qfr];
      await newProject.save();
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.passportScore = qfr.minimumPassportScore;
      await user.save();

      await saveDonationDirectlyToDb(
        {
          ...createDonationData(),
          status: 'verified',
          valueUsd: 1,
          qfRoundId: qfr.id,
          qfRoundUserScore: user.passportScore,
        },
        user.id,
        newProject.id,
      );
    }

    await refreshProjectActualMatchingView();
    const actualMatchingFundData = (
      await getQfRoundActualDonationDetails(qfr.id)
    ).sort((a, b) => (b.projectWeight || 0) - (a?.projectWeight || 0));
    assert.equal(actualMatchingFundData.length, 6);

    // The maximum reward is 20% of the allocated fund (100)
    assert.equal(actualMatchingFundData[0].realMatchingFund, 20);

    assert.equal(actualMatchingFundData[1].realMatchingFund, 16);
    assert.equal(actualMatchingFundData[2].realMatchingFund, 16);
    assert.equal(actualMatchingFundData[3].realMatchingFund, 16);
    assert.equal(actualMatchingFundData[4].realMatchingFund, 16);
    assert.equal(actualMatchingFundData[5].realMatchingFund, 16);
    await QfRound.update({}, { isActive: false });
  });
  it('Weight should be calculated correct when project have different donations', async () => {
    const qfr = QfRound.create({
      roundNumber: generateQfRoundNumber(),
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      minimumValidUsdValue: 1,
      slug: new Date().getTime().toString(),
      eligibleNetworks: [
        NETWORK_IDS.XDAI,
        NETWORK_IDS.OPTIMISTIC,
        NETWORK_IDS.POLYGON,
        NETWORK_IDS.MAIN_NET,
      ],
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfr.save();

    const p = await saveProjectDirectlyToDb(createProjectData());
    p.qfRounds = [qfr];
    await p.save();
    const u = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    u.passportScore = qfr.minimumPassportScore;
    await u.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: 2,
        qfRoundId: qfr.id,
        qfRoundUserScore: u.passportScore,
      },
      u.id,
      p.id,
    );

    for (let i = 0; i < 5; i++) {
      const newProject = await saveProjectDirectlyToDb(createProjectData());
      newProject.qfRounds = [qfr];
      await newProject.save();
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.passportScore = qfr.minimumPassportScore;
      await user.save();

      await saveDonationDirectlyToDb(
        {
          ...createDonationData(),
          status: 'verified',
          valueUsd: 1,
          qfRoundId: qfr.id,
          qfRoundUserScore: user.passportScore,
        },
        user.id,
        newProject.id,
      );
    }

    const p2 = await saveProjectDirectlyToDb(createProjectData());
    p2.qfRounds = [qfr];
    await p2.save();
    const u2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    u2.passportScore = qfr.minimumPassportScore;
    await u2.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: 3,
        qfRoundId: qfr.id,
        qfRoundUserScore: u2.passportScore,
      },
      u2.id,
      p2.id,
    );

    await refreshProjectActualMatchingView();
    const actualMatchingFundData = (
      await getQfRoundActualDonationDetails(qfr.id)
    ).sort((a, b) => (b.projectWeight || 0) - (a?.projectWeight || 0));
    assert.equal(actualMatchingFundData.length, 7);
    assert.equal(
      actualMatchingFundData.reduce((accumulator, currentRow) => {
        return accumulator + currentRow.realMatchingFund;
      }, 0),
      qfr.allocatedFund,
    );

    // The maximum reward is 20% of the allocated fund (100)
    assert.equal(actualMatchingFundData[0].realMatchingFund, 20);
    assert.equal(actualMatchingFundData[1].realMatchingFund, 20);

    assert.equal(actualMatchingFundData[2].realMatchingFund, 12);
    assert.equal(actualMatchingFundData[3].realMatchingFund, 12);
    assert.equal(actualMatchingFundData[4].realMatchingFund, 12);
    assert.equal(actualMatchingFundData[5].realMatchingFund, 12);
    assert.equal(actualMatchingFundData[6].realMatchingFund, 12);
    await QfRound.update({}, { isActive: false });
  });
}
