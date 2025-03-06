import moment from 'moment';
import { assert } from 'chai';
import {
  createDonationData,
  createProjectData,
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
}
