import { assert } from 'chai';
import {
  findCauseProjectByCauseAndProject,
  findCauseProjectsByCauseId,
  createOrUpdateCauseProject,
  updateCauseProjectDistribution,
  updateCauseProjectEvaluation,
  bulkUpdateCauseProjectDistribution,
  bulkUpdateCauseProjectEvaluation,
} from './causeProjectRepository';
import {
  saveUserDirectlyToDb,
  saveProjectDirectlyToDb,
  deleteProjectDirectlyFromDb,
  createCauseData,
} from '../../test/testUtils';
import { createCause } from './causeRepository';
import { Cause, CauseProject } from '../entities/project';

describe('causeProjectRepository test cases', () => {
  let testUser: any;
  let testProject: any;
  let testCause: any;

  before(async () => {
    // Create test user
    testUser = await saveUserDirectlyToDb(`0x123${Date.now()}`);

    // Create test project
    testProject = await saveProjectDirectlyToDb(
      createCauseData(`test-project-${Date.now()}`),
    );

    // Create test cause
    testCause = await createCause(
      createCauseData(`0xuniquehash${Date.now()}`),
      testUser,
      [testProject],
    );
  });

  after(async () => {
    // Clean up test data
    if (testCause) {
      await CauseProject.getRepository().query(
        'DELETE FROM "cause_project" WHERE "causeId" = $1',
        [testCause.id],
      );
      await Cause.getRepository().query(
        'DELETE FROM "project" WHERE "id" = $1',
        [testCause.id],
      );
    }

    if (testProject) {
      await deleteProjectDirectlyFromDb(testProject.id);
    }
  });

  describe('findCauseProjectByCauseAndProject() test cases', () => {
    it('should find cause project by cause and project IDs', async () => {
      const causeProject = await findCauseProjectByCauseAndProject(
        testCause.id,
        testProject.id,
      );

      assert.isOk(causeProject);
      assert.equal(causeProject?.causeId, testCause.id);
      assert.equal(causeProject?.projectId, testProject.id);
      assert.equal(causeProject?.amountReceived, 0);
      assert.equal(causeProject?.amountReceivedUsdValue, 0);
      assert.equal(causeProject?.causeScore, 0);
    });

    it('should return null for non-existent cause project', async () => {
      const causeProject = await findCauseProjectByCauseAndProject(
        999999,
        999999,
      );
      assert.isNull(causeProject);
    });
  });

  describe('findCauseProjectsByCauseId() test cases', () => {
    it('should find all cause projects for a cause', async () => {
      const causeProjects = await findCauseProjectsByCauseId(testCause.id);

      assert.isOk(causeProjects);
      assert.isArray(causeProjects);
      assert.equal(causeProjects.length, 1);
      assert.equal(causeProjects[0].causeId, testCause.id);
      assert.equal(causeProjects[0].projectId, testProject.id);
    });

    it('should return empty array for non-existent cause', async () => {
      const causeProjects = await findCauseProjectsByCauseId(999999);
      assert.isArray(causeProjects);
      assert.equal(causeProjects.length, 0);
    });
  });

  describe('createOrUpdateCauseProject() test cases', () => {
    it('should create new cause project when it does not exist', async () => {
      // Create a new project for this test
      const newProject = await saveProjectDirectlyToDb(
        createCauseData(`test-project-new-${Date.now()}`),
      );

      try {
        const causeProject = await createOrUpdateCauseProject(
          testCause.id,
          newProject.id,
          {
            amountReceived: 50.5,
            amountReceivedUsdValue: 125.25,
            causeScore: 75.0,
          },
        );

        assert.isOk(causeProject);
        assert.equal(causeProject.causeId, testCause.id);
        assert.equal(causeProject.projectId, newProject.id);
        assert.equal(causeProject.amountReceived, 50.5);
        assert.equal(causeProject.amountReceivedUsdValue, 125.25);
        assert.equal(causeProject.causeScore, 75.0);
      } finally {
        // Clean up
        await CauseProject.getRepository().query(
          'DELETE FROM "cause_project" WHERE "projectId" = $1',
          [newProject.id],
        );
        await deleteProjectDirectlyFromDb(newProject.id);
      }
    });

    it('should update existing cause project', async () => {
      const causeProject = await createOrUpdateCauseProject(
        testCause.id,
        testProject.id,
        {
          amountReceived: 100.0,
          amountReceivedUsdValue: 250.0,
          causeScore: 85.0,
        },
      );

      assert.isOk(causeProject);
      assert.equal(causeProject.causeId, testCause.id);
      assert.equal(causeProject.projectId, testProject.id);
      assert.equal(causeProject.amountReceived, 100.0);
      assert.equal(causeProject.amountReceivedUsdValue, 250.0);
      assert.equal(causeProject.causeScore, 85.0);
    });

    it('should update only specified fields', async () => {
      const causeProject = await createOrUpdateCauseProject(
        testCause.id,
        testProject.id,
        {
          causeScore: 90.0,
        },
      );

      assert.isOk(causeProject);
      assert.equal(causeProject.causeScore, 90.0);
      // Previous values should remain unchanged
      assert.equal(causeProject.amountReceived, 100.0);
      assert.equal(causeProject.amountReceivedUsdValue, 250.0);
    });

    it('should throw error for non-existent cause', async () => {
      try {
        await createOrUpdateCauseProject(999999, testProject.id, {
          amountReceived: 50.0,
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.include(error.message, 'Cause not found');
      }
    });

    it('should throw error for non-existent project', async () => {
      try {
        await createOrUpdateCauseProject(testCause.id, 999999, {
          amountReceived: 50.0,
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.include(error.message, 'Project not found');
      }
    });
  });

  describe('updateCauseProjectDistribution() test cases', () => {
    it('should update distribution data successfully', async () => {
      const causeProject = await updateCauseProjectDistribution(
        testCause.id,
        testProject.id,
        150.0,
        375.0,
      );

      assert.isOk(causeProject);
      assert.equal(causeProject.causeId, testCause.id);
      assert.equal(causeProject.projectId, testProject.id);
      assert.equal(causeProject.amountReceived, 150.0);
      assert.equal(causeProject.amountReceivedUsdValue, 375.0);
      // causeScore should remain unchanged
      assert.equal(causeProject.causeScore, 90.0);
    });

    it('should create new record if it does not exist', async () => {
      // Create a new project for this test
      const newProject = await saveProjectDirectlyToDb(
        createCauseData(`test-project-dist-${Date.now()}`),
      );

      try {
        const causeProject = await updateCauseProjectDistribution(
          testCause.id,
          newProject.id,
          200.0,
          500.0,
        );

        assert.isOk(causeProject);
        assert.equal(causeProject.causeId, testCause.id);
        assert.equal(causeProject.projectId, newProject.id);
        assert.equal(causeProject.amountReceived, 200.0);
        assert.equal(causeProject.amountReceivedUsdValue, 500.0);
        assert.equal(causeProject.causeScore, 0); // Default value
      } finally {
        // Clean up
        await CauseProject.getRepository().query(
          'DELETE FROM "cause_project" WHERE "projectId" = $1',
          [newProject.id],
        );
        await deleteProjectDirectlyFromDb(newProject.id);
      }
    });
  });

  describe('updateCauseProjectEvaluation() test cases', () => {
    it('should update evaluation data successfully', async () => {
      const causeProject = await updateCauseProjectEvaluation(
        testCause.id,
        testProject.id,
        95.0,
      );

      assert.isOk(causeProject);
      assert.equal(causeProject.causeId, testCause.id);
      assert.equal(causeProject.projectId, testProject.id);
      assert.equal(causeProject.causeScore, 95.0);
      // Distribution data should remain unchanged
      assert.equal(causeProject.amountReceived, 150.0);
      assert.equal(causeProject.amountReceivedUsdValue, 375.0);
    });

    it('should create new record if it does not exist', async () => {
      // Create a new project for this test
      const newProject = await saveProjectDirectlyToDb(
        createCauseData(`test-project-eval-${Date.now()}`),
      );

      try {
        const causeProject = await updateCauseProjectEvaluation(
          testCause.id,
          newProject.id,
          88.0,
        );

        assert.isOk(causeProject);
        assert.equal(causeProject.causeId, testCause.id);
        assert.equal(causeProject.projectId, newProject.id);
        assert.equal(causeProject.causeScore, 88.0);
        assert.equal(causeProject.amountReceived, 0); // Default value
        assert.equal(causeProject.amountReceivedUsdValue, 0); // Default value
      } finally {
        // Clean up
        await CauseProject.getRepository().query(
          'DELETE FROM "cause_project" WHERE "projectId" = $1',
          [newProject.id],
        );
        await deleteProjectDirectlyFromDb(newProject.id);
      }
    });
  });

  describe('bulkUpdateCauseProjectDistribution() test cases', () => {
    it('should update multiple cause projects distribution data', async () => {
      // Create additional projects for bulk test
      const project1 = await saveProjectDirectlyToDb(
        createCauseData(`test-project-bulk1-${Date.now()}`),
      );
      const project2 = await saveProjectDirectlyToDb(
        createCauseData(`test-project-bulk2-${Date.now()}`),
      );

      try {
        const updates = [
          {
            causeId: testCause.id,
            projectId: project1.id,
            amountReceived: 300.0,
            amountReceivedUsdValue: 750.0,
          },
          {
            causeId: testCause.id,
            projectId: project2.id,
            amountReceived: 400.0,
            amountReceivedUsdValue: 1000.0,
          },
        ];

        const results = await bulkUpdateCauseProjectDistribution(updates);

        assert.isOk(results);
        assert.isArray(results);
        assert.equal(results.length, 2);

        assert.equal(results[0].causeId, testCause.id);
        assert.equal(results[0].projectId, project1.id);
        assert.equal(results[0].amountReceived, 300.0);
        assert.equal(results[0].amountReceivedUsdValue, 750.0);

        assert.equal(results[1].causeId, testCause.id);
        assert.equal(results[1].projectId, project2.id);
        assert.equal(results[1].amountReceived, 400.0);
        assert.equal(results[1].amountReceivedUsdValue, 1000.0);
      } finally {
        // Clean up
        await CauseProject.getRepository().query(
          'DELETE FROM "cause_project" WHERE "projectId" IN ($1, $2)',
          [project1.id, project2.id],
        );
        await deleteProjectDirectlyFromDb(project1.id);
        await deleteProjectDirectlyFromDb(project2.id);
      }
    });

    it('should handle empty updates array', async () => {
      const results = await bulkUpdateCauseProjectDistribution([]);
      assert.isArray(results);
      assert.equal(results.length, 0);
    });
  });

  describe('bulkUpdateCauseProjectEvaluation() test cases', () => {
    it('should update multiple cause projects evaluation data', async () => {
      // Create additional projects for bulk test
      const project1 = await saveProjectDirectlyToDb(
        createCauseData(`test-project-bulk-eval1-${Date.now()}`),
      );
      const project2 = await saveProjectDirectlyToDb(
        createCauseData(`test-project-bulk-eval2-${Date.now()}`),
      );

      try {
        const updates = [
          {
            causeId: testCause.id,
            projectId: project1.id,
            causeScore: 92.0,
          },
          {
            causeId: testCause.id,
            projectId: project2.id,
            causeScore: 87.0,
          },
        ];

        const results = await bulkUpdateCauseProjectEvaluation(updates);

        assert.isOk(results);
        assert.isArray(results);
        assert.equal(results.length, 2);

        assert.equal(results[0].causeId, testCause.id);
        assert.equal(results[0].projectId, project1.id);
        assert.equal(results[0].causeScore, 92.0);

        assert.equal(results[1].causeId, testCause.id);
        assert.equal(results[1].projectId, project2.id);
        assert.equal(results[1].causeScore, 87.0);
      } finally {
        // Clean up
        await CauseProject.getRepository().query(
          'DELETE FROM "cause_project" WHERE "projectId" IN ($1, $2)',
          [project1.id, project2.id],
        );
        await deleteProjectDirectlyFromDb(project1.id);
        await deleteProjectDirectlyFromDb(project2.id);
      }
    });

    it('should handle empty updates array', async () => {
      const results = await bulkUpdateCauseProjectEvaluation([]);
      assert.isArray(results);
      assert.equal(results.length, 0);
    });
  });
});
