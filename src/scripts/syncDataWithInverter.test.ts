import { assert } from 'chai';
import sinon from 'sinon';
import { Not, In } from 'typeorm';
import { Project } from '../entities/project';
import {
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEtheriumAddress,
  createDonationData,
  saveDonationDirectlyToDb,
  deleteProjectDirectlyFromDb,
  saveEARoundDirectlyToDb,
} from '../../test/testUtils';
import { Donation } from '../entities/donation';
import { syncDonationsWithBlockchainData } from './syncDataWithInverter';
import { InverterAdapter } from '../adapters/inverter/inverterAdapter';
import { EarlyAccessRound } from '../entities/earlyAccessRound';

describe.skip('Sync Donations Script Test Cases', () => {
  let existingProjectIds: number[] = [];
  let existingDonationIds: number[] = [];
  beforeEach(async () => {
    existingProjectIds =
      (await Project.find({ select: ['id'] }))?.map(project => project.id) ||
      [];
    existingDonationIds =
      (await Donation.find({ select: ['id'] }))?.map(donation => donation.id) ||
      [];
  });
  afterEach(async () => {
    sinon.restore();
  });
  it('should update token price and total supply for projects', async () => {
    const projectData = createProjectData();
    const project = await saveProjectDirectlyToDb({
      ...projectData,
      abc: {
        tokenName: 'test',
        tokenTicker: 'TST',
        fundingManagerAddress: '0x33594B06D16767d6457025EA9a5A0319D37259A3', // got from inverter (not related to the orchestrator)
        issuanceTokenAddress: '0xb4D2c2c57b8c871C16454566CEea2729C352F95E', // got form inverter (related to the orchestrator)
        orchestratorAddress: '0xF941fBf191146b6526adE31E94283640Ed706773', // got from inverter (we have some liner vesting data for this address)
        chainId: 84532, // relate to the test data on inverter
        projectAddress: projectData.walletAddress,
        icon: 'test icon',
        creatorAddress: generateRandomEtheriumAddress(),
        nftContractAddress: generateRandomEtheriumAddress(),
      },
    });

    const earlyAccessRound = await saveEARoundDirectlyToDb({
      roundNumber: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-05'),
      roundUSDCapPerProject: 1000000,
      roundUSDCapPerUserPerProject: 50000,
      tokenPrice: 0.12345678,
    });

    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData({ transactionId: '0x123' }),
        fromWalletAddress: '0xce989336BdED425897Ac63d1359628E26E24f794', // got from inverter
        blockNumber: 1234,
        earlyAccessRoundId: earlyAccessRound.id,
      },
      undefined,
      project.id,
    );

    sinon
      .stub(InverterAdapter.prototype, 'getBlockTimestamp')
      .resolves(1725987224);

    await syncDonationsWithBlockchainData({
      projectFilter: {
        id: Not(In(existingProjectIds)),
      },
      donationFilter: {
        id: Not(In(existingDonationIds)),
      },
    });

    const updatedProject = await Project.findOneBy({
      id: project.id,
    });

    assert.equal(updatedProject?.abc.tokenPrice, 0.000000000000004444);
    assert.equal(updatedProject?.abc.totalSupply, 201001.63618501218);

    const updatedDonation = await Donation.findOneBy({
      id: donation.id,
    });

    assert.equal(updatedDonation?.cliff, 2);
    assert.equal(
      updatedDonation?.rewardStreamStart?.getTime(),
      new Date(1).getTime(),
    );
    assert.equal(
      updatedDonation?.rewardStreamEnd?.getTime(),
      new Date(10).getTime(),
    );
    assert.equal(updatedDonation?.rewardTokenAmount, 0.004);

    await Donation.remove(donation);
    await EarlyAccessRound.remove(earlyAccessRound);
    await deleteProjectDirectlyFromDb(project.id);
  });
});
