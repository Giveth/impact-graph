import { assert } from 'chai';
import sinon from 'sinon';
import { Not, In } from 'typeorm';
import { Project } from '../entities/project';
import {
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEtheriumAddress,
  deleteProjectDirectlyFromDb,
} from '../../test/testUtils';
import { syncDonationsWithIndexerData } from './syncDataWithInverter';
import { InverterAdapter } from '../adapters/inverter/inverterAdapter';

describe.skip('Sync Donations Script Test Cases', () => {
  let existingProjectIds: number[] = [];
  beforeEach(async () => {
    existingProjectIds =
      (await Project.find({ select: ['id'] }))?.map(project => project.id) ||
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

    sinon
      .stub(InverterAdapter.prototype, 'getBlockTimestamp')
      .resolves(1725987224);

    await syncDonationsWithIndexerData({
      projectFilter: {
        id: Not(In(existingProjectIds)),
      },
    });

    const updatedProject = await Project.findOneBy({
      id: project.id,
    });

    assert.equal(updatedProject?.abc.tokenPrice, 0.000000000000004444);
    assert.equal(updatedProject?.abc.totalSupply, 201001.63618501218);

    await deleteProjectDirectlyFromDb(project.id);
  });
});
