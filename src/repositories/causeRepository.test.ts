import { assert } from 'chai';
import { CauseStatus } from '../entities/cause';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import { Cause } from '../entities/cause';
import {
  findCauseById,
  findCauseByCauseId,
  findCausesByOwnerId,
  findCausesByProjectIds,
  createCause,
  activateCause,
  deactivateCause,
  validateCauseTitle,
} from './causeRepository';
import {
  saveUserDirectlyToDb,
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEtheriumAddress,
} from '../../test/testUtils';

describe('causeRepository test cases', () => {
  let testUser: User;
  let testProject: Project;
  let testCause: Cause;

  const createTestCauseData = (causeId: string) => ({
    title: 'test cause',
    description: 'test description',
    chainId: 1,
    fundingPoolAddress: '0x123',
    causeId,
    mainCategory: 'test',
    subCategories: ['test'],
    status: CauseStatus.PENDING,
  });

  beforeEach(async () => {
    // Truncate all relevant tables in the correct order with CASCADE
    await Cause.getRepository().query(
      'TRUNCATE TABLE "cause" RESTART IDENTITY CASCADE',
    );
    await Cause.getRepository().query(
      'TRUNCATE TABLE "project" RESTART IDENTITY CASCADE',
    );
    await Cause.getRepository().query(
      'TRUNCATE TABLE "user" RESTART IDENTITY CASCADE',
    );

    // Create test user
    const userWallet = generateRandomEtheriumAddress();
    testUser = await saveUserDirectlyToDb(userWallet);

    // Create test project
    const projectData = createProjectData('test project');
    projectData.adminUserId = testUser.id;
    testProject = await saveProjectDirectlyToDb(projectData);

    // Create test cause
    testCause = await createCause(
      createTestCauseData('test-cause-id-0'),
      testUser,
      [testProject],
    );
  });

  describe('findCauseById test cases', () => {
    it('should find cause by id with relations', async () => {
      const foundCause = await findCauseById(testCause.id);

      assert.isOk(foundCause);
      assert.equal(foundCause?.id, testCause.id);
      assert.equal(foundCause?.title, testCause.title);
      assert.equal(foundCause?.description, testCause.description);
      assert.equal(foundCause?.chainId, testCause.chainId);
      assert.equal(
        foundCause?.fundingPoolAddress,
        testCause.fundingPoolAddress,
      );
      assert.equal(foundCause?.causeId, testCause.causeId);
      assert.equal(foundCause?.mainCategory, testCause.mainCategory);
      assert.deepEqual(foundCause?.subCategories, testCause.subCategories);
      assert.equal(foundCause?.status, testCause.status);
      assert.equal(foundCause?.owner.id, testUser.id);
      assert.equal(foundCause?.projects[0].id, testProject.id);
    });

    it('should return null when cause not found', async () => {
      const foundCause = await findCauseById(999999);
      assert.isNull(foundCause);
    });
  });

  describe('findCauseByCauseId test cases', () => {
    it('should find cause by causeId with relations', async () => {
      const foundCause = await findCauseByCauseId(testCause.causeId);

      assert.isOk(foundCause);
      assert.equal(foundCause?.causeId, testCause.causeId);
      assert.equal(foundCause?.title, testCause.title);
      assert.equal(foundCause?.description, testCause.description);
      assert.equal(foundCause?.chainId, testCause.chainId);
      assert.equal(
        foundCause?.fundingPoolAddress,
        testCause.fundingPoolAddress,
      );
      assert.equal(foundCause?.mainCategory, testCause.mainCategory);
      assert.deepEqual(foundCause?.subCategories, testCause.subCategories);
      assert.equal(foundCause?.status, testCause.status);
      assert.equal(foundCause?.owner.id, testUser.id);
      assert.equal(foundCause?.projects[0].id, testProject.id);
    });

    it('should return null when cause not found', async () => {
      const foundCause = await findCauseByCauseId('non-existent-cause-id');
      assert.isNull(foundCause);
    });
  });

  describe('findCausesByOwnerId test cases', () => {
    it('should find causes by owner id with relations', async () => {
      // Create another cause for the same owner
      await createCause(createTestCauseData('test-cause-id-1'), testUser, [
        testProject,
      ]);

      const causes = await findCausesByOwnerId(testUser.id);

      assert.equal(causes.length, 2);
      assert.equal(causes[0].owner.id, testUser.id);
      assert.equal(causes[1].owner.id, testUser.id);
      assert.equal(causes[0].projects[0].id, testProject.id);
      assert.equal(causes[1].projects[0].id, testProject.id);
      assert.notEqual(causes[0].causeId, causes[1].causeId);
    });

    it('should return empty array when no causes found', async () => {
      const causes = await findCausesByOwnerId(999999);
      assert.equal(causes.length, 0);
    });
  });

  describe('findCausesByProjectIds test cases', () => {
    it('should find causes by project ids with relations', async () => {
      // Create a second project
      const project2Data = createProjectData('test project 2');
      project2Data.adminUserId = testUser.id;
      const project2 = await saveProjectDirectlyToDb(project2Data);

      // Create a cause with both projects
      const multiProjectCause = await createCause(
        createTestCauseData('test-cause-id-2'),
        testUser,
        [testProject, project2],
      );

      const causes = await findCausesByProjectIds([
        testProject.id,
        project2.id,
      ]);

      assert.equal(causes.length, 2); // Should find both the original cause and the new one
      const foundMultiProjectCause = causes.find(
        c => c.causeId === multiProjectCause.causeId,
      );
      assert.isOk(foundMultiProjectCause);
      assert.equal(foundMultiProjectCause?.projects.length, 2);
      assert.equal(foundMultiProjectCause?.projects[0].id, testProject.id);
      assert.equal(foundMultiProjectCause?.projects[1].id, project2.id);
    });

    it('should return empty array when no causes found', async () => {
      const causes = await findCausesByProjectIds([999999]);
      assert.equal(causes.length, 0);
    });
  });

  describe('createCause test cases', () => {
    it('should create cause with relations', async () => {
      const causeData = createTestCauseData('test-cause-id-3');
      const cause = await createCause(causeData, testUser, [testProject]);

      assert.isOk(cause);
      assert.equal(cause.title, causeData.title);
      assert.equal(cause.description, causeData.description);
      assert.equal(cause.chainId, causeData.chainId);
      assert.equal(cause.fundingPoolAddress, causeData.fundingPoolAddress);
      assert.equal(cause.causeId, causeData.causeId);
      assert.equal(cause.mainCategory, causeData.mainCategory);
      assert.deepEqual(cause.subCategories, causeData.subCategories);
      assert.equal(cause.status, causeData.status);
      assert.equal(cause.owner.id, testUser.id);
      assert.equal(cause.projects[0].id, testProject.id);

      // Check if user's ownedCausesCount was updated
      const updatedUser = await User.findOne({ where: { id: testUser.id } });
      assert.equal(updatedUser?.ownedCausesCount, 2); // Including the one from beforeEach
    });
  });

  describe('activateCause test cases', () => {
    it('should activate cause and update project counts', async () => {
      const activatedCause = await activateCause(testCause.causeId);

      assert.equal(activatedCause?.status, CauseStatus.ACTIVE);
      assert.equal(activatedCause?.causeId, testCause.causeId);

      // Check if project's activeCausesCount was updated
      const updatedProject = await Project.findOne({
        where: { id: testProject.id },
      });
      assert.equal(updatedProject?.activeCausesCount, 1);
    });

    it('should not activate already active cause', async () => {
      // First activate the cause
      await activateCause(testCause.causeId);

      // Try to activate it again
      const activatedCause = await activateCause(testCause.causeId);

      assert.equal(activatedCause?.status, CauseStatus.ACTIVE);
      assert.equal(activatedCause?.causeId, testCause.causeId);

      // Check if project's activeCausesCount was not changed
      const updatedProject = await Project.findOne({
        where: { id: testProject.id },
      });
      assert.equal(updatedProject?.activeCausesCount, 1);
    });
  });

  describe('deactivateCause test cases', () => {
    it('should deactivate cause and update project counts', async () => {
      // First activate the cause
      await activateCause(testCause.causeId);

      const deactivatedCause = await deactivateCause(testCause.causeId);

      assert.equal(deactivatedCause?.status, CauseStatus.DEACTIVE);
      assert.equal(deactivatedCause?.causeId, testCause.causeId);

      // Check if project's activeCausesCount was updated
      const updatedProject = await Project.findOne({
        where: { id: testProject.id },
      });
      assert.equal(updatedProject?.activeCausesCount, 0);
    });

    it('should not deactivate already inactive cause', async () => {
      const deactivatedCause = await deactivateCause(testCause.causeId);

      assert.equal(deactivatedCause?.status, CauseStatus.DEACTIVE);
      assert.equal(deactivatedCause?.causeId, testCause.causeId);

      // Check if project's activeCausesCount was not changed
      const updatedProject = await Project.findOne({
        where: { id: testProject.id },
      });
      assert.equal(updatedProject?.activeCausesCount, 0);
    });
  });

  describe('validateCauseTitle test cases', () => {
    it('should return true for a unique title', async () => {
      const result = await validateCauseTitle('Unique Test Cause Title');
      assert.isTrue(result);
    });

    it('should throw error for empty title', async () => {
      try {
        await validateCauseTitle('');
        assert.fail('Should have thrown an error');
      } catch (e) {
        assert.equal(e.message, 'Invalid input');
      }
    });

    it('should throw error for whitespace-only title', async () => {
      try {
        await validateCauseTitle('   ');
        assert.fail('Should have thrown an error');
      } catch (e) {
        assert.equal(e.message, 'Invalid input');
      }
    });

    it('should throw error for existing title', async () => {
      // First create a cause with a specific title
      const causeTitle = 'Existing Test Cause Title';
      await createCause(
        {
          ...createTestCauseData('test-cause-id-4'),
          title: causeTitle,
        },
        testUser,
        [testProject],
      );

      // Then try to validate the same title
      try {
        await validateCauseTitle(causeTitle);
        assert.fail('Should have thrown an error');
      } catch (e) {
        assert.equal(e.message, 'Cause title already exists');
      }
    });

    it('should trim whitespace from title before validation', async () => {
      // First create a cause with a specific title
      const causeTitle = 'Test Cause Title';
      await createCause(
        {
          ...createTestCauseData('test-cause-id-5'),
          title: causeTitle,
        },
        testUser,
        [testProject],
      );

      // Try to validate the same title with extra whitespace
      try {
        await validateCauseTitle('  Test Cause Title  ');
        assert.fail('Should have thrown an error');
      } catch (e) {
        assert.equal(e.message, 'Cause title already exists');
      }
    });
  });
});
