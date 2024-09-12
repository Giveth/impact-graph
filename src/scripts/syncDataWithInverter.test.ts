import { assert } from 'chai';
import sinon from 'sinon';
import { Project } from '../entities/project';
import {
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEtheriumAddress,
  createDonationData,
  saveDonationDirectlyToDb,
  deleteProjectDirectlyFromDb,
} from '../../test/testUtils';
import { Donation } from '../entities/donation';
import { syncDonationsWithBlockchainData } from './syncDataWithInverter';
import { InverterAdapter } from '../adapters/inverter/inverterAdapter';

describe('Sync Donations Script Test Cases', () => {
  afterEach(() => {
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

    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        fromWalletAddress: '0xce989336BdED425897Ac63d1359628E26E24f794', // got from inverter
        blockNumber: 1234,
      },
      undefined,
      project.id,
    );

    sinon
      .stub(InverterAdapter.prototype, 'getBlockTimestamp')
      .resolves(1725987104);

    await syncDonationsWithBlockchainData();

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
    await deleteProjectDirectlyFromDb(project.id);
  });
});
