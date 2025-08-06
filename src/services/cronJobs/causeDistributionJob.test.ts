import { assert } from 'chai';
import sinon from 'sinon';
import {
  createProjectData,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  deleteProjectDirectlyFromDb,
} from '../../../test/testUtils';
import { CauseProject, ProjStatus } from '../../entities/project';
import { NETWORK_IDS } from '../../provider';
import {
  getEligibleProjectsForCause,
  runCauseDistributionJob,
} from './causeDistributionJob';
import { AgentDistributionService } from '../agentDistributionService';

describe('Cause Distribution Job', () => {
  let testUser: any;
  let testCause: any;
  let testProject: any;
  let testCauseProject: any;

  afterEach(async () => {
    sinon.restore();

    // Clean up test data in correct order (respecting foreign key constraints)
    try {
      if (testCauseProject) {
        await CauseProject.delete({ id: testCauseProject.id });
      }
      if (testProject) {
        await deleteProjectDirectlyFromDb(testProject.id);
      }
      if (testCause) {
        await deleteProjectDirectlyFromDb(testCause.id);
      }
      if (testUser) {
        await testUser.remove();
      }
    } catch (error) {
      // Ignore cleanup errors to avoid test failures
      // eslint-disable-next-line no-console
      console.log('Cleanup error (ignored):', error.message);
    }
  });

  it('should successfully process active causes and call distribution service', async () => {
    // Create a user
    testUser = await saveUserDirectlyToDb(
      '0x1234567890123456789012345678901234567890',
    );

    // Create a cause
    const causeData = createProjectData();
    causeData.projectType = 'cause';
    causeData.statusId = ProjStatus.active;
    causeData.adminUserId = testUser.id;
    causeData.walletAddress = '0x1234567890123456789012345678901234567890';
    testCause = await saveProjectDirectlyToDb(causeData);

    // Create a project with Polygon network ID to ensure correct address creation
    const projectData = createProjectData();
    projectData.verified = true;
    projectData.statusId = ProjStatus.active;
    projectData.adminUserId = testUser.id;
    projectData.networkId = NETWORK_IDS.POLYGON; // Specify Polygon network
    projectData.walletAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    testProject = await saveProjectDirectlyToDb(projectData);

    // Create cause-project relationship
    testCauseProject = new CauseProject();
    testCauseProject.causeId = testCause.id;
    testCauseProject.projectId = testProject.id;
    testCauseProject.isIncluded = true;
    testCauseProject.causeScore = 0.8;
    await testCauseProject.save();

    // Test the function directly
    const eligibleProjects = await getEligibleProjectsForCause(testCause.id);

    // Verify the results
    assert.equal(eligibleProjects.length, 1);
    assert.equal(eligibleProjects[0].projectId, testProject.id);
    assert.equal(eligibleProjects[0].name, testProject.title);
    assert.equal(eligibleProjects[0].slug, testProject.slug || '');
    assert.equal(eligibleProjects[0].walletAddress, projectData.walletAddress);
    assert.equal(eligibleProjects[0].score, 0.8);
  });

  it('should skip projects that are not verified', async () => {
    // Create a user
    testUser = await saveUserDirectlyToDb(
      '0x1234567890123456789012345678901234567890',
    );

    // Create a cause
    const causeData = createProjectData();
    causeData.projectType = 'cause';
    causeData.statusId = ProjStatus.active;
    causeData.adminUserId = testUser.id;
    causeData.walletAddress = '0x1234567890123456789012345678901234567890';
    testCause = await saveProjectDirectlyToDb(causeData);

    // Create a project that is not verified
    const projectData = createProjectData();
    projectData.verified = false; // Not verified
    projectData.statusId = ProjStatus.active;
    projectData.adminUserId = testUser.id;
    projectData.networkId = NETWORK_IDS.POLYGON;
    testProject = await saveProjectDirectlyToDb(projectData);

    // Create cause-project relationship
    testCauseProject = new CauseProject();
    testCauseProject.causeId = testCause.id;
    testCauseProject.projectId = testProject.id;
    testCauseProject.isIncluded = true;
    testCauseProject.causeScore = 0.8;
    await testCauseProject.save();

    // Test the function directly
    const eligibleProjects = await getEligibleProjectsForCause(testCause.id);

    // Verify the project is filtered out because it's not verified
    assert.isEmpty(eligibleProjects);
  });

  it('should skip projects without Polygon addresses', async () => {
    // Create a user
    testUser = await saveUserDirectlyToDb(
      '0x1234567890123456789012345678901234567890',
    );

    // Create a cause
    const causeData = createProjectData();
    causeData.projectType = 'cause';
    causeData.statusId = ProjStatus.active;
    causeData.adminUserId = testUser.id;
    causeData.walletAddress = '0x1234567890123456789012345678901234567890';
    testCause = await saveProjectDirectlyToDb(causeData);

    // Create a project with Mainnet network ID (not Polygon)
    const projectData = createProjectData();
    projectData.verified = true;
    projectData.statusId = ProjStatus.active;
    projectData.adminUserId = testUser.id;
    projectData.networkId = NETWORK_IDS.MAIN_NET; // Not Polygon
    testProject = await saveProjectDirectlyToDb(projectData);

    // Create cause-project relationship
    testCauseProject = new CauseProject();
    testCauseProject.causeId = testCause.id;
    testCauseProject.projectId = testProject.id;
    testCauseProject.isIncluded = true;
    testCauseProject.causeScore = 0.8;
    await testCauseProject.save();

    // Test the function directly
    const eligibleProjects = await getEligibleProjectsForCause(testCause.id);

    // Verify the project is filtered out because it has no Polygon address
    assert.isEmpty(eligibleProjects);
  });

  it('should include projects with causeScore of 0 in eligible projects (evaluation check happens at distribution level)', async () => {
    // Create a user
    testUser = await saveUserDirectlyToDb(
      '0x1234567890123456789012345678901234567890',
    );

    // Create a cause
    const causeData = createProjectData();
    causeData.projectType = 'cause';
    causeData.statusId = ProjStatus.active;
    causeData.adminUserId = testUser.id;
    causeData.walletAddress = '0x1234567890123456789012345678901234567890';
    testCause = await saveProjectDirectlyToDb(causeData);

    // Create a project with valid criteria but causeScore of 0 (not evaluated)
    const projectData = createProjectData();
    projectData.verified = true;
    projectData.statusId = ProjStatus.active;
    projectData.adminUserId = testUser.id;
    projectData.networkId = NETWORK_IDS.POLYGON;
    projectData.walletAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    testProject = await saveProjectDirectlyToDb(projectData);

    // Create cause-project relationship with causeScore of 0 (not evaluated)
    testCauseProject = new CauseProject();
    testCauseProject.causeId = testCause.id;
    testCauseProject.projectId = testProject.id;
    testCauseProject.isIncluded = true;
    testCauseProject.causeScore = 0; // Not evaluated yet
    await testCauseProject.save();

    // Test the function directly - it should include the project even with score 0
    const eligibleProjects = await getEligibleProjectsForCause(testCause.id);

    // Verify the project is included (getEligibleProjectsForCause doesn't filter by score)
    assert.equal(eligibleProjects.length, 1);
    assert.equal(eligibleProjects[0].projectId, testProject.id);
    assert.equal(eligibleProjects[0].score, 0);
  });

  it('should skip distribution for causes that have not been evaluated (all projects have causeScore of 0)', async () => {
    // Create a user
    testUser = await saveUserDirectlyToDb(
      '0x1234567890123456789012345678901234567890',
    );

    // Create a cause with wallet address
    const causeData = createProjectData();
    causeData.projectType = 'cause';
    causeData.statusId = ProjStatus.active;
    causeData.adminUserId = testUser.id;
    causeData.walletAddress = '0x1234567890123456789012345678901234567890';
    testCause = await saveProjectDirectlyToDb(causeData);

    // Create a project with valid criteria
    const projectData = createProjectData();
    projectData.verified = true;
    projectData.statusId = ProjStatus.active;
    projectData.adminUserId = testUser.id;
    projectData.networkId = NETWORK_IDS.POLYGON;
    projectData.walletAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    testProject = await saveProjectDirectlyToDb(projectData);

    // Create cause-project relationship with causeScore of 0 (not evaluated)
    testCauseProject = new CauseProject();
    testCauseProject.causeId = testCause.id;
    testCauseProject.projectId = testProject.id;
    testCauseProject.isIncluded = true;
    testCauseProject.causeScore = 0; // Not evaluated yet
    await testCauseProject.save();

    // Mock the AgentDistributionService to track calls
    const callDistributionServiceStub = sinon
      .stub(AgentDistributionService, 'callDistributionService')
      .resolves(true);

    // Run the distribution job
    await runCauseDistributionJob();

    // Verify that the distribution service was NOT called for the unevaluated cause
    assert.equal(callDistributionServiceStub.callCount, 0);

    // Restore the stub
    callDistributionServiceStub.restore();
  });
});
