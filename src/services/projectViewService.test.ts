import {
  getQfRoundActualDonationDetails,
  refreshProjectActualMatchingView,
} from './projectViewsService';
import { QfRound } from '../entities/qfRound';
import { Project } from '../entities/project';
import { NETWORK_IDS } from '../provider';
import moment from 'moment';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { assert } from 'chai';

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
}
