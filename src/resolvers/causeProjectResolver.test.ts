import { assert } from 'chai';
import axios from 'axios';
import {
  updateCauseProjectDistributionMutation,
  updateCauseProjectEvaluationMutation,
  causeProjectQuery,
  causeProjectsQuery,
} from '../../test/graphqlQueries';
import { graphqlUrl } from '../../test/testUtils';
import {
  saveUserDirectlyToDb,
  saveProjectDirectlyToDb,
  deleteProjectDirectlyFromDb,
} from '../../test/testUtils';
import { createCause } from '../repositories/causeRepository';
import { Cause, CauseProject } from '../entities/project';
import { createCauseData } from '../../test/testUtils';

describe('CauseProjectResolver test cases', () => {
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

  describe('updateCauseProjectDistribution() test cases', () => {
    it('should update cause project distribution data successfully', async () => {
      const variables = {
        input: {
          causeId: testCause.id,
          projectId: testProject.id,
          amountReceived: 100.5,
          amountReceivedUsdValue: 250.75,
        },
      };

      const response = await axios.post(graphqlUrl, {
        query: updateCauseProjectDistributionMutation,
        variables,
      });

      const result = response.data.data.updateCauseProjectDistribution;
      assert.isOk(result);
      assert.equal(result.causeId, testCause.id);
      assert.equal(result.projectId, testProject.id);
      assert.equal(result.amountReceived, 100.5);
      assert.equal(result.amountReceivedUsdValue, 250.75);
      assert.equal(result.causeScore, 0); // Should remain unchanged
    });

    it('should fail with invalid cause ID', async () => {
      const variables = {
        input: {
          causeId: 999999,
          projectId: testProject.id,
          amountReceived: 100.5,
          amountReceivedUsdValue: 250.75,
        },
      };

      const response = await axios.post(graphqlUrl, {
        query: updateCauseProjectDistributionMutation,
        variables,
      });

      assert.isOk(response.data.errors);
      assert.include(response.data.errors[0].message, 'Cause not found');
    });

    it('should fail with invalid project ID', async () => {
      const variables = {
        input: {
          causeId: testCause.id,
          projectId: 999999,
          amountReceived: 100.5,
          amountReceivedUsdValue: 250.75,
        },
      };

      const response = await axios.post(graphqlUrl, {
        query: updateCauseProjectDistributionMutation,
        variables,
      });

      assert.isOk(response.data.errors);
      assert.include(response.data.errors[0].message, 'Project not found');
    });
  });

  describe('updateCauseProjectEvaluation() test cases', () => {
    it('should update cause project evaluation data successfully', async () => {
      const variables = {
        input: {
          causeId: testCause.id,
          projectId: testProject.id,
          causeScore: 85.5,
        },
      };

      const response = await axios.post(graphqlUrl, {
        query: updateCauseProjectEvaluationMutation,
        variables,
      });

      const result = response.data.data.updateCauseProjectEvaluation;
      assert.isOk(result);
      assert.equal(result.causeId, testCause.id);
      assert.equal(result.projectId, testProject.id);
      assert.equal(result.causeScore, 85.5);
      // Previous distribution data should remain
      assert.equal(result.amountReceived, 100.5);
      assert.equal(result.amountReceivedUsdValue, 250.75);
    });
  });

  describe('causeProject() test cases', () => {
    it('should retrieve cause project data successfully', async () => {
      const variables = {
        causeId: testCause.id,
        projectId: testProject.id,
      };

      const response = await axios.post(graphqlUrl, {
        query: causeProjectQuery,
        variables,
      });

      const result = response.data.data.causeProject;
      assert.isOk(result);
      assert.equal(result.causeId, testCause.id);
      assert.equal(result.projectId, testProject.id);
      assert.equal(result.amountReceived, 100.5);
      assert.equal(result.amountReceivedUsdValue, 250.75);
      assert.equal(result.causeScore, 85.5);
    });

    it('should return null for non-existent cause project', async () => {
      const variables = {
        causeId: 999999,
        projectId: 999999,
      };

      const response = await axios.post(graphqlUrl, {
        query: causeProjectQuery,
        variables,
      });

      const result = response.data.data.causeProject;
      assert.isNull(result);
    });
  });

  describe('causeProjects() test cases', () => {
    it('should retrieve all cause projects for a cause', async () => {
      const variables = {
        causeId: testCause.id,
      };

      const response = await axios.post(graphqlUrl, {
        query: causeProjectsQuery,
        variables,
      });

      const result = response.data.data.causeProjects;
      assert.isOk(result);
      assert.isArray(result);
      assert.equal(result.length, 1);
      assert.equal(result[0].causeId, testCause.id);
      assert.equal(result[0].projectId, testProject.id);
      assert.equal(result[0].amountReceived, 100.5);
      assert.equal(result[0].amountReceivedUsdValue, 250.75);
      assert.equal(result[0].causeScore, 85.5);
    });
  });
});
