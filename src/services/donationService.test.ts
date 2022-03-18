import { assert } from 'chai';
import {
  isTokenAcceptableForProject,
  updateTotalDonationsOfProject,
} from './donationService';
import { NETWORK_IDS } from '../provider';
import {
  createProjectData,
  DONATION_SEED_DATA,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { Token } from '../entities/token';
import { ORGANIZATION_LABELS } from '../entities/organization';
import { Project } from '../entities/project';

describe('isProjectAcceptToken test cases', isProjectAcceptTokenTestCases);
describe(
  'updateTotalDonationsOfProject test cases',
  updateTotalDonationsOfProjectTestCases,
);

function isProjectAcceptTokenTestCases() {
  it('should return true for giveth projects accepting GIV on xdai', async () => {
    const token = await Token.findOne({
      symbol: 'GIV',
      networkId: NETWORK_IDS.XDAI,
    });
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it('should return true for giveth projects accepting GIV on mainnet', async () => {
    const token = await Token.findOne({
      symbol: 'GIV',
      networkId: NETWORK_IDS.MAIN_NET,
    });
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it('should return true for giveth projects accepting WETH on xdai', async () => {
    const token = await Token.findOne({
      symbol: 'WETH',
      networkId: NETWORK_IDS.XDAI,
    });
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it('should return true for trace projects accepting GIV on xdai', async () => {
    const token = await Token.findOne({
      symbol: 'GIV',
      networkId: NETWORK_IDS.XDAI,
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it('should return true for trace projects accepting GIV on mainnet', async () => {
    const token = await Token.findOne({
      symbol: 'GIV',
      networkId: NETWORK_IDS.MAIN_NET,
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it('should return true for trace projects accepting WETH on xdai', async () => {
    const token = await Token.findOne({
      symbol: 'WETH',
      networkId: NETWORK_IDS.XDAI,
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it('should return true for givingBlock projects accepting ETH on mainnet', async () => {
    const token = await Token.findOne({
      symbol: 'ETH',
      networkId: NETWORK_IDS.MAIN_NET,
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it('should return false for givingblock projects accepting GIV on xdai', async () => {
    const token = await Token.findOne({
      symbol: 'GIV',
      networkId: NETWORK_IDS.XDAI,
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isFalse(result);
  });
  it('should return false for givingblock projects accepting XDAI on xdai', async () => {
    const token = await Token.findOne({
      symbol: 'XDAI',
      networkId: NETWORK_IDS.XDAI,
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isFalse(result);
  });
  it('should return false for givingblock projects accepting GIV on mainnet', async () => {
    const token = await Token.findOne({
      symbol: 'GIV',
      networkId: NETWORK_IDS.MAIN_NET,
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isFalse(result);
  });
}

function updateTotalDonationsOfProjectTestCases() {
  it('should not change updatedAt', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await updateTotalDonationsOfProject(project.id);
    const updatedProject = (await Project.findOne({
      id: project.id,
    })) as Project;
    assert.equal(
      new Date(project.updatedAt).getTime(),
      new Date(updatedProject.updatedAt).getTime(),
    );
  });

  it('should update totalDonations of project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donation = await saveDonationDirectlyToDb(
      DONATION_SEED_DATA.FIRST_DONATION,
      SEED_DATA.FIRST_USER.id,
      project.id,
    );
    await updateTotalDonationsOfProject(project.id);
    const updatedProject = (await Project.findOne({
      id: project.id,
    })) as Project;
    assert.equal(updatedProject.totalDonations, donation.valueUsd);
    assert.equal(
      new Date(updatedProject.updatedAt).getTime(),
      new Date(project.updatedAt).getTime(),
    );
  });
}
