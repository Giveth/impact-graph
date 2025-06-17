import { assert } from 'chai';
import { CauseStatus, ListingStatus } from '../entities/cause';
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
  findAllCauses,
  CauseSortField,
  SortDirection,
} from './causeRepository';
import {
  saveUserDirectlyToDb,
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEtheriumAddress,
  deleteProjectDirectlyFromDb,
} from '../../test/testUtils';

describe('causeRepository test cases', () => {
  let testUser: User;
  let testProject: Project;
  let testCause: Cause;

  const createTestCauseData = (causeId: string, txHash: string) => ({
    title: `test cause ${Date.now()}`,
    description: 'test description',
    chainId: 1,
    fundingPoolAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
    causeId,
    mainCategory: 'test',
    subCategories: ['test'],
    status: CauseStatus.PENDING,
    depositTxHash: txHash,
    depositTxChainId: 137,
  });

  beforeEach(async () => {
    // Create test user
    const userWallet = generateRandomEtheriumAddress();
    testUser = await saveUserDirectlyToDb(userWallet);

    // Create test project
    const projectData = createProjectData(`test project ${Date.now()}`);
    projectData.adminUserId = testUser.id;
    testProject = await saveProjectDirectlyToDb(projectData);

    // Create test cause
    testCause = await createCause(
      createTestCauseData('test-cause-id-0', `0x123456789abcdef${Date.now()}`),
      testUser,
      [testProject],
    );
  });

  afterEach(async () => {
    // First clean up project-causes relationships
    await Cause.getRepository().query(
      'DELETE FROM "project_causes_cause" WHERE "causeId" IN (SELECT id FROM "cause" WHERE "title" LIKE $1)',
      ['test cause%'],
    );
    // Then clean up causes
    await Cause.getRepository().query(
      'DELETE FROM "cause" WHERE "title" LIKE $1',
      ['test cause%'],
    );
    // Clean up project
    if (testProject?.id) {
      await deleteProjectDirectlyFromDb(testProject.id);
    }
    // Delete user last since it's referenced by causes
    if (testUser?.walletAddress) {
      await User.getRepository().query(
        'DELETE FROM "user" WHERE "walletAddress" = $1',
        [testUser.walletAddress],
      );
    }
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
      assert.equal(foundCause?.depositTxHash, testCause.depositTxHash);
      assert.equal(foundCause?.depositTxChainId, testCause.depositTxChainId);
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
      const secondCause = await createCause(
        createTestCauseData('test-cause-id-1', `0xuniquehash1${Date.now()}`),
        testUser,
        [testProject],
      );

      const causes = await findCausesByOwnerId(testUser.id);

      assert.equal(causes.length, 2);
      assert.equal(causes[0].owner.id, testUser.id);
      assert.equal(causes[1].owner.id, testUser.id);
      assert.equal(causes[0].projects[0].id, testProject.id);
      assert.equal(causes[1].projects[0].id, testProject.id);
      assert.notEqual(causes[0].causeId, causes[1].causeId);

      // Clean up second cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [secondCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        secondCause.id,
      ]);
    });

    it('should return empty array when no causes found', async () => {
      const causes = await findCausesByOwnerId(999999);
      assert.equal(causes.length, 0);
    });
  });

  describe('findCausesByProjectIds test cases', () => {
    it('should find causes by project ids with relations', async () => {
      // Create a second project
      const project2Data = createProjectData(`test project 2 ${Date.now()}`);
      project2Data.adminUserId = testUser.id;
      const project2 = await saveProjectDirectlyToDb(project2Data);

      // Create a cause with both projects
      const multiProjectCause = await createCause(
        createTestCauseData('test-cause-id-2', `0xuniquehash2${Date.now()}`),
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

      // Clean up second project and multi-project cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [multiProjectCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        multiProjectCause.id,
      ]);
      await deleteProjectDirectlyFromDb(project2.id);
    });

    it('should return empty array when no causes found', async () => {
      const causes = await findCausesByProjectIds([999999]);
      assert.equal(causes.length, 0);
    });
  });

  describe('createCause test cases', () => {
    it('should create cause with relations', async () => {
      const causeData = createTestCauseData(
        'test-cause-id-3',
        `0xuniquehash3${Date.now()}`,
      );
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
      assert.equal(cause.depositTxHash, causeData.depositTxHash);
      assert.equal(cause.depositTxChainId, causeData.depositTxChainId);
      assert.equal(cause.owner.id, testUser.id);
      assert.equal(cause.projects[0].id, testProject.id);

      // Check if user's ownedCausesCount was updated
      const updatedUser = await User.findOne({ where: { id: testUser.id } });
      assert.equal(updatedUser?.ownedCausesCount, 2); // Including the one from beforeEach

      // Clean up created cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [cause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        cause.id,
      ]);
    });

    it('should throw error when deposit transaction hash is missing', async () => {
      const causeData = {
        ...createTestCauseData('test-cause-id-10', '0xuniquehash10'),
        depositTxHash: undefined,
      };

      try {
        await createCause(causeData, testUser, [testProject]);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.equal(
          error.message,
          'null value in column "depositTxHash" of relation "cause" violates not-null constraint',
        );
      }
    });

    it('should throw error when deposit chain id is missing', async () => {
      const causeData = {
        ...createTestCauseData('test-cause-id-11', '0xuniquehash11'),
        depositTxChainId: undefined,
      };

      try {
        await createCause(causeData, testUser, [testProject]);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.equal(
          error.message,
          'null value in column "depositTxChainId" of relation "cause" violates not-null constraint',
        );
      }
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
    it('should validate a unique cause title', async () => {
      const isValid = await validateCauseTitle('unique cause title');
      assert.isTrue(isValid);
    });

    it('should throw error for empty title', async () => {
      try {
        await validateCauseTitle('');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.equal(error.message, 'Invalid input');
      }
    });

    it('should throw error for whitespace-only title', async () => {
      try {
        await validateCauseTitle('   ');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.equal(error.message, 'Invalid input');
      }
    });

    it('should throw error for existing title', async () => {
      // First create a cause with a specific title
      const causeTitle = `Existing Test Cause Title ${Date.now()}`;
      const existingCause = await createCause(
        {
          ...createTestCauseData(
            'test-cause-id-4',
            `0xuniquehash4${Date.now()}`,
          ),
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

      // Clean up existing cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [existingCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        existingCause.id,
      ]);
    });

    it('should trim whitespace from title before validation', async () => {
      // First create a cause with a specific title
      const causeTitle = `Test Cause Title ${Date.now()}`;
      const existingCause = await createCause(
        {
          ...createTestCauseData(
            'test-cause-id-5',
            `0xuniquehash5${Date.now()}`,
          ),
          title: causeTitle,
        },
        testUser,
        [testProject],
      );

      // Try to validate the same title with extra whitespace
      try {
        await validateCauseTitle(`  ${causeTitle}  `);
        assert.fail('Should have thrown an error');
      } catch (e) {
        assert.equal(e.message, 'Cause title already exists');
      }

      // Clean up existing cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [existingCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        existingCause.id,
      ]);
    });
  });

  describe('findAllCauses test cases', () => {
    it('should find all causes with relations', async () => {
      // Create a second cause
      const secondCause = await createCause(
        createTestCauseData('test-cause-id-4', `0xuniquehash4${Date.now()}`),
        testUser,
        [testProject],
      );

      const causes = await findAllCauses();
      assert.equal(causes.length, 2);
      assert.equal(causes[0].owner.id, testUser.id);
      assert.equal(causes[1].owner.id, testUser.id);
      assert.equal(causes[0].projects[0].id, testProject.id);
      assert.equal(causes[1].projects[0].id, testProject.id);

      // Clean up second cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [secondCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        secondCause.id,
      ]);
    });

    it('should respect limit parameter', async () => {
      // Create a second cause
      const secondCause = await createCause(
        createTestCauseData('test-cause-id-5', `0xuniquehash5${Date.now()}`),
        testUser,
        [testProject],
      );

      const causes = await findAllCauses(1);
      assert.equal(causes.length, 1);

      // Clean up second cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [secondCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        secondCause.id,
      ]);
    });

    it('should respect offset parameter', async () => {
      // Create a second cause
      const secondCause = await createCause(
        createTestCauseData('test-cause-id-6', `0xuniquehash6${Date.now()}`),
        testUser,
        [testProject],
      );

      const causes = await findAllCauses(1, 1);
      assert.equal(causes.length, 1);
      assert.equal(causes[0].id, testCause.id); // Should be the first cause

      const causes2 = await findAllCauses(1, 0);
      assert.equal(causes2.length, 1);
      assert.equal(causes2[0].id, secondCause.id); // Should be the second cause

      // Clean up second cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [secondCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        secondCause.id,
      ]);
    });

    it('should return causes in descending order by createdAt by default', async () => {
      // Create a second cause
      const secondCause = await createCause(
        createTestCauseData('test-cause-id-7', `0xuniquehash7${Date.now()}`),
        testUser,
        [testProject],
      );

      const causes = await findAllCauses();
      assert.equal(causes.length, 2);
      assert.equal(causes[0].id, secondCause.id); // Most recent first
      assert.equal(causes[1].id, testCause.id);

      // Clean up second cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [secondCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        secondCause.id,
      ]);
    });

    it('should handle limit and offset together', async () => {
      // Create two more causes
      const secondCause = await createCause(
        createTestCauseData('test-cause-id-8', `0xuniquehash8${Date.now()}`),
        testUser,
        [testProject],
      );
      const thirdCause = await createCause(
        createTestCauseData('test-cause-id-9', `0xuniquehash9${Date.now()}`),
        testUser,
        [testProject],
      );

      const causes = await findAllCauses(2, 1);
      assert.equal(causes.length, 2);
      // Should skip the most recent cause and return the next two
      assert.equal(causes[0].id, secondCause.id);
      assert.equal(causes[1].id, testCause.id);

      // Clean up additional causes
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" IN ($1, $2)',
        [secondCause.id, thirdCause.id],
      );
      await Cause.getRepository().query(
        'DELETE FROM "cause" WHERE "id" IN ($1, $2)',
        [secondCause.id, thirdCause.id],
      );
    });

    it('should return empty array when no causes match offset', async () => {
      const causes = await findAllCauses(10, 100);
      assert.equal(causes.length, 0);
    });

    it('should filter by chainId', async () => {
      // Create a cause with different chainId
      const differentChainCause = await createCause(
        {
          ...createTestCauseData(
            'test-cause-id-10',
            `0xuniquehash10${Date.now()}`,
          ),
          chainId: 1, // Different chain ID
        },
        testUser,
        [testProject],
      );

      const causes = await findAllCauses(undefined, undefined, 137); // Filter by chainId 137
      assert.equal(causes.length, 1);
      assert.equal(causes[0].chainId, 137);

      // Clean up different chain cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [differentChainCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        differentChainCause.id,
      ]);
    });

    it('should filter by search term', async () => {
      // Create a cause with specific title
      const searchableCause = await createCause(
        {
          ...createTestCauseData(
            'test-cause-id-11',
            `0xuniquehash11${Date.now()}`,
          ),
          title: 'Unique Searchable Title',
          description: 'This is a unique description',
        },
        testUser,
        [testProject],
      );

      const causes = await findAllCauses(
        undefined,
        undefined,
        undefined,
        'Unique Searchable',
      );
      assert.equal(causes.length, 1);
      assert.equal(causes[0].id, searchableCause.id);

      // Clean up searchable cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [searchableCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        searchableCause.id,
      ]);
    });

    it('should sort by totalRaised', async () => {
      // Create causes with different totalRaised values
      const lowRaisedCause = await createCause(
        {
          ...createTestCauseData(
            'test-cause-id-12',
            `0xuniquehash12${Date.now()}`,
          ),
          totalRaised: 100,
        },
        testUser,
        [testProject],
      );
      const highRaisedCause = await createCause(
        {
          ...createTestCauseData(
            'test-cause-id-13',
            `0xuniquehash13${Date.now()}`,
          ),
          totalRaised: 1000,
        },
        testUser,
        [testProject],
      );

      const causes = await findAllCauses(
        undefined,
        undefined,
        undefined,
        undefined,
        CauseSortField.AMOUNT_RAISED,
        SortDirection.DESC,
      );
      assert.equal(causes.length, 3); // Including the original testCause
      assert.equal(causes[0].id, highRaisedCause.id); // Highest first
      assert.equal(causes[1].id, lowRaisedCause.id);

      // Clean up additional causes
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" IN ($1, $2)',
        [lowRaisedCause.id, highRaisedCause.id],
      );
      await Cause.getRepository().query(
        'DELETE FROM "cause" WHERE "id" IN ($1, $2)',
        [lowRaisedCause.id, highRaisedCause.id],
      );
    });

    it('should filter by listing status', async () => {
      // Update test cause to have a specific listing status
      await Cause.update(
        { id: testCause.id },
        { listingStatus: ListingStatus.NotReviewed },
      );

      const causes = await findAllCauses(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ListingStatus.NotReviewed,
      );
      assert.equal(causes.length, 1);
      assert.equal(causes[0].listingStatus, ListingStatus.NotReviewed);

      // Reset the listing status
      await Cause.update(
        { id: testCause.id },
        { listingStatus: ListingStatus.Listed },
      );
    });

    it('should return all causes when listingStatus is "all"', async () => {
      // Create a cause with different listing status
      const notListedCause = await createCause(
        {
          ...createTestCauseData(
            'test-cause-id-14',
            `0xuniquehash14${Date.now()}`,
          ),
        },
        testUser,
        [testProject],
      );
      await Cause.update(
        { id: notListedCause.id },
        { listingStatus: ListingStatus.NotListed },
      );

      const causes = await findAllCauses(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'all',
      );
      assert.equal(causes.length, 2); // Should return both causes

      // Clean up not listed cause
      await Cause.getRepository().query(
        'DELETE FROM "project_causes_cause" WHERE "causeId" = $1',
        [notListedCause.id],
      );
      await Cause.getRepository().query('DELETE FROM "cause" WHERE "id" = $1', [
        notListedCause.id,
      ]);
    });
  });
});
