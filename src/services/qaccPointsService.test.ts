import moment from 'moment';
import { assert } from 'chai';
import {
  createDonationData,
  createProjectData,
  deleteProjectDirectlyFromDb,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { Project } from '../entities/project';
import { QfRound } from '../entities/qfRound';
import { User } from '../entities/user';
import { findUserById } from '../repositories/userRepository';
import { QaccPointsHistory } from '../entities/qaccPointsHistory';
import { addQaccPointsForDonation } from './qaccPointsService';
import { Donation } from '../entities/donation';

describe(
  'addQaccPointsForDonation() test cases',
  addQaccPointsForDonationTestCases,
);

function addQaccPointsForDonationTestCases() {
  let qfRound: QfRound;
  let firstProject: Project;
  let projectOwner: User;
  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      slug: new Date().getTime().toString(),
      allocatedFund: 100,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    projectOwner = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    firstProject = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );

    // firstProject.qfRounds = [qfRound];

    // await firstProject.save();
  });
  afterEach(async () => {
    // Clean up the database after each test
    await Donation.delete({});
    await QfRound.delete(qfRound.id);
    await deleteProjectDirectlyFromDb(firstProject.id);
    await Project.delete({ id: firstProject.id });
    await User.delete([projectOwner.id]);
  });

  it('should add qaccPointsHistory and update user points', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.qaccPointsMultiplier = 2;
    await user.save();
    const donationAmount = 100;
    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: donationAmount,
        qfRoundId: qfRound.id,
        status: 'verified',
        user: user,
      },
      user.id,
      firstProject.id,
    );
    await addQaccPointsForDonation(donation);

    const updatedUser = await findUserById(user.id);

    const history = await QaccPointsHistory.findOne({
      where: { donation: { id: donation.id } },
    });

    assert.equal(
      history?.pointsEarned,
      donationAmount * user?.qaccPointsMultiplier,
    );
    assert.equal(
      updatedUser?.qaccPoints,
      donationAmount * user?.qaccPointsMultiplier,
    );
  });

  it('should not process the same donation twice', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.qaccPointsMultiplier = 2;
    await user.save();

    const donationAmount = 100;

    // Create and save a single verified donation
    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: donationAmount,
        status: 'verified',
        qfRoundId: qfRound.id,
        user: user,
      },
      user.id,
      firstProject.id,
    );

    // Process the donation once
    await addQaccPointsForDonation(donation);

    // Fetch user and history after first processing
    const updatedUserAfterFirstProcessing = await findUserById(user.id);
    const historyAfterFirstProcessing = await QaccPointsHistory.find({
      where: { donation: { id: donation.id } },
    });

    // Process the same donation again
    await addQaccPointsForDonation(donation);

    // Fetch user and history after second processing attempt
    const updatedUserAfterSecondProcessing = await findUserById(user.id);
    const historyAfterSecondProcessing = await QaccPointsHistory.find({
      where: { donation: { id: donation.id } },
    });
    // Assertions: Ensure no duplicate processing
    assert.equal(
      updatedUserAfterFirstProcessing?.qaccPoints,
      donationAmount * user.qaccPointsMultiplier,
      'User points should be correctly calculated after first processing',
    );

    assert.equal(
      updatedUserAfterFirstProcessing?.qaccPoints,
      updatedUserAfterSecondProcessing?.qaccPoints,
      'User qaccPoints should not increase after second processing',
    );

    assert.equal(
      historyAfterFirstProcessing.length,
      1,
      'There should be only one history record after first processing',
    );

    assert.equal(
      historyAfterSecondProcessing.length,
      1,
      'History record count should remain the same after second processing',
    );
  });
}
