import { assert, expect } from 'chai';
import moment from 'moment';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { Project } from '../entities/project';

import {
  fillQfRoundHistory,
  getQfRoundHistoriesThatDontHaveRelatedDonations,
  getQfRoundHistory,
} from './qfRoundHistoryRepository';

describe('fillQfRoundHistory test cases', fillQfRoundHistoryTestCases);
describe(
  'getQfRoundHistoriesThatDontHaveRelatedDonations test cases',
  getQfRoundHistoriesThatDontHaveRelatedDonationsTestCases,
);

// TODO need to have more test cases for this conditions:
// when there is no donation for a project
// when there is no donation for a qfRound
// when there is some donation for a project and qfRound and some not
function fillQfRoundHistoryTestCases() {
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
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    firstProject = await saveProjectDirectlyToDb(createProjectData());
    secondProject = await saveProjectDirectlyToDb(createProjectData());

    // firstProject.qfRounds = [qfRound];
    // secondProject.qfRounds = [qfRound];

    // await firstProject.save();
    // await secondProject.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return correct value for single project', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
          }),
        );
      }),
    );

    // if want to fill history round end date should be passed and be inactive
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });

    expect(foundQfRoundHistory!.uniqueDonors).to.equal(3);
    expect(foundQfRoundHistory!.raisedFundInUsd).to.equal(129);
  });
  it('should return correct value for two project', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(async valueUsd => {
            await saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
            await saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              secondProject.id,
            );
          }),
        );
      }),
    );

    // if want to fill history round end date should be passed and be inactive
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistoryForFirstProject = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    const foundQfRoundHistoryForSecondProject = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });

    expect(foundQfRoundHistoryForFirstProject!.uniqueDonors).to.equal(3);
    expect(foundQfRoundHistoryForFirstProject!.raisedFundInUsd).to.equal(129);

    expect(foundQfRoundHistoryForSecondProject!.uniqueDonors).to.equal(3);
    expect(foundQfRoundHistoryForSecondProject!.raisedFundInUsd).to.equal(129);
  });
  it('should not fill qfRoundHistory for non active qfRounds', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
          }),
        );
      }),
    );

    qfRound.endDate = moment().subtract(1, 'days').toDate();
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isNull(foundQfRoundHistory);
  });
  it('should not fill qfRoundHistory for rounds that their endDate hasn passed', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
          }),
        );
      }),
    );

    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isNull(foundQfRoundHistory);
  });
  it('should not cconsider donors passport score', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user1.passportScore = 6;
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user2.passportScore = 12;
    await user2.save();
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 10,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user1.id,
      firstProject.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 15,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user2.id,
      firstProject.id,
    );
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isOk(foundQfRoundHistory);
    assert.equal(foundQfRoundHistory?.uniqueDonors, 2);
    assert.equal(foundQfRoundHistory?.raisedFundInUsd, 25);
  });
  it('should not count unverified donations', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.passportScore = 12;
    await user.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 10,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user.id,
      firstProject.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 15,
        qfRoundId: qfRound.id,
        status: 'pending',
      },
      user.id,
      firstProject.id,
    );
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const foundQfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isOk(foundQfRoundHistory);
    assert.equal(foundQfRoundHistory?.uniqueDonors, 1);
    assert.equal(foundQfRoundHistory?.raisedFundInUsd, 10);
  });
}

function getQfRoundHistoriesThatDontHaveRelatedDonationsTestCases() {
  let qfRound: QfRound;
  let firstProject: Project;
  let secondProject: Project;
  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      slug: new Date().getTime().toString(),
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    firstProject = await saveProjectDirectlyToDb(createProjectData());
    secondProject = await saveProjectDirectlyToDb(createProjectData());

    // firstProject.qfRounds = [qfRound];
    // secondProject.qfRounds = [qfRound];

    // await firstProject.save();
    // await secondProject.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return correct value for single project', async () => {
    const inCompleteQfRoundHistories =
      await getQfRoundHistoriesThatDontHaveRelatedDonations();
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
          }),
        );
      }),
    );

    // if want to fill history round end date should be passed and be inactive
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const qfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isNotNull(qfRoundHistory);
    qfRoundHistory!.distributedFundTxHash = generateRandomEvmTxHash();
    qfRoundHistory!.distributedFundNetwork = '100';
    qfRoundHistory!.matchingFundAmount = 1000;
    qfRoundHistory!.matchingFundCurrency = 'DAI';
    qfRoundHistory!.matchingFund = 1000;
    await qfRoundHistory?.save();

    const inCompleteQfRoundHistories2 =
      await getQfRoundHistoriesThatDontHaveRelatedDonations();
    assert.equal(
      inCompleteQfRoundHistories2.length - inCompleteQfRoundHistories.length,
      1,
    );
  });
  it('should return correct value for two projects', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(async valueUsd => {
            await saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
            await saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              secondProject.id,
            );
          }),
        );
      }),
    );

    // if want to fill history round end date should be passed and be inactive
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();
    const inCompleteQfRoundHistories =
      await getQfRoundHistoriesThatDontHaveRelatedDonations();

    await fillQfRoundHistory();
    const qfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isNotNull(qfRoundHistory);
    qfRoundHistory!.distributedFundTxHash = generateRandomEvmTxHash();
    qfRoundHistory!.distributedFundNetwork = '100';
    qfRoundHistory!.matchingFundAmount = 1000;
    qfRoundHistory!.matchingFundCurrency = 'DAI';
    qfRoundHistory!.matchingFund = 1000;
    await qfRoundHistory?.save();

    const qfRoundHistory2 = await getQfRoundHistory({
      projectId: secondProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isNotNull(qfRoundHistory);
    qfRoundHistory2!.distributedFundTxHash = generateRandomEvmTxHash();
    qfRoundHistory2!.distributedFundNetwork = '100';
    qfRoundHistory2!.matchingFundAmount = 1000;
    qfRoundHistory2!.matchingFundCurrency = 'DAI';
    qfRoundHistory2!.matchingFund = 1000;
    await qfRoundHistory2?.save();
    const inCompleteQfRoundHistories2 =
      await getQfRoundHistoriesThatDontHaveRelatedDonations();
    assert.equal(
      inCompleteQfRoundHistories2.length - inCompleteQfRoundHistories.length,
      2,
    );
  });
}
