import { assert } from 'chai';
import axios from 'axios';
import sinon from 'sinon';
import {
  saveUserDirectlyToDb,
  saveProjectDirectlyToDb,
  createProjectData,
  generateTestAccessToken,
  deleteProjectDirectlyFromDb,
} from '../../test/testUtils';
import {
  createCauseQuery,
  isValidCauseTitleQuery,
  causesQuery,
  causeByIdQuery,
} from '../../test/graphqlQueries';
import { Cause } from '../entities/cause';
import { Project } from '../entities/project';
import { User } from '../entities/user';
import * as verifyTransactionModule from '../utils/transactionVerification';

beforeEach(async () => {
  // Mock verifyTransaction to return true in tests
  sinon.stub(verifyTransactionModule, 'verifyTransaction').resolves(true);
});

afterEach(() => {
  sinon.restore();
});

describe('isValidCauseTitle() test cases', () => {
  it('should return true for a unique title', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: isValidCauseTitleQuery,
      variables: {
        title: 'Unique Test Cause Title',
      },
    });

    assert.isTrue(response.data.data.isValidCauseTitle);
  });

  it('should throw error for empty title', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: isValidCauseTitleQuery,
      variables: {
        title: '',
      },
    });

    const errorMsg = response.data.errors?.[0]?.message;
    assert.isOk(errorMsg, 'Error message should be defined');
    assert.equal(errorMsg, 'Invalid input');
  });

  it('should throw error for whitespace-only title', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: isValidCauseTitleQuery,
      variables: {
        title: '   ',
      },
    });

    const errorMsg = response.data.errors?.[0]?.message;
    assert.isOk(errorMsg, 'Error message should be defined');
    assert.equal(errorMsg, 'Invalid input');
  });

  it('should throw error for existing title', async () => {
    // First create a cause with a specific title
    const user = await saveUserDirectlyToDb(`0x123${Date.now()}`);
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-${Date.now()}-${index}`),
            slug: `test-project-${Date.now()}-${index}`,
          }),
        ),
    );
    const token = await generateTestAccessToken(user.id);

    const causeTitle = `Existing Test Cause Title ${Date.now()}`;
    await axios.post(
      'http://localhost:4000/graphql',
      {
        query: createCauseQuery,
        variables: {
          title: causeTitle,
          description: 'Test Description',
          chainId: 137,
          projectIds: projects.map(p => p.id),
          mainCategory: 'test',
          subCategories: ['sub1', 'sub2'],
          depositTxHash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef${Date.now()}`,
          depositTxChainId: 137,
        },
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );

    // Then try to validate the same title
    const response = await axios.post('http://localhost:4000/graphql', {
      query: isValidCauseTitleQuery,
      variables: {
        title: causeTitle,
      },
    });

    const errorMsg = response.data.errors?.[0]?.message;
    assert.isOk(errorMsg, 'Error message should be defined');
    assert.equal(errorMsg, 'Cause title already exists');

    // Clean up test data
    await Cause.getRepository().query(
      'DELETE FROM "project_causes_cause" WHERE "causeId" IN (SELECT id FROM "cause" WHERE "title" = $1)',
      [causeTitle],
    );
    await Cause.getRepository().query(
      'DELETE FROM "cause" WHERE "title" = $1',
      [causeTitle],
    );
    for (const project of projects) {
      await deleteProjectDirectlyFromDb(project.id);
    }
    await User.getRepository().query(
      'DELETE FROM "user" WHERE "walletAddress" = $1',
      [user.walletAddress],
    );
  });

  it('should handle special characters in title', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: isValidCauseTitleQuery,
      variables: {
        title: 'Test Cause Title!@#$%^&*()',
      },
    });

    assert.isTrue(response.data.data.isValidCauseTitle);
  });

  it('should handle long titles', async () => {
    const longTitle = 'A'.repeat(255); // Maximum length for text field
    const response = await axios.post('http://localhost:4000/graphql', {
      query: isValidCauseTitleQuery,
      variables: {
        title: longTitle,
      },
    });

    assert.isTrue(response.data.data.isValidCauseTitle);
  });
});

describe('createCause() test cases', () => {
  it('should create cause successfully with valid input', async () => {
    const user = await saveUserDirectlyToDb(`0x123${Date.now()}`);
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-${Date.now()}-${index}`),
            slug: `test-project-${Date.now()}-${index}`,
          }),
        ),
    );
    const token = await generateTestAccessToken(user.id);

    const variables = {
      title: `Test Cause ${Date.now()}`,
      description: 'Test Description',
      chainId: 137,
      projectIds: projects.map(p => p.id),
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
      depositTxHash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef${Date.now()}`,
      depositTxChainId: 137,
    };

    const response = await axios.post(
      'http://localhost:4000/graphql',
      {
        query: createCauseQuery,
        variables,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );

    const cause = response.data.data.createCause;
    assert.isOk(cause);
    assert.equal(cause.title, variables.title);
    assert.equal(cause.description, 'Test Description');
    assert.equal(cause.chainId, 137);
    assert.equal(cause.mainCategory, 'test');
    assert.deepEqual(cause.subCategories, ['sub1', 'sub2']);
    assert.equal(cause.status, 'PENDING');
    assert.equal(cause.owner.id, user.id);
    assert.equal(cause.projects.length, 5);
    assert.equal(cause.activeProjectsCount, 5);

    // Clean up test data
    await Cause.getRepository().query(
      'DELETE FROM "project_causes_cause" WHERE "causeId" IN (SELECT id FROM "cause" WHERE "title" = $1)',
      [variables.title],
    );
    await Cause.getRepository().query(
      'DELETE FROM "cause" WHERE "title" = $1',
      [variables.title],
    );
    for (const project of projects) {
      await deleteProjectDirectlyFromDb(project.id);
    }
    await User.getRepository().query(
      'DELETE FROM "user" WHERE "walletAddress" = $1',
      [user.walletAddress],
    );
  });

  it('should fail when user is not authenticated', async () => {
    const variables = {
      title: 'Test Cause',
      description: 'Test Description',
      chainId: 137,
      projectIds: [1, 2, 3, 4, 5],
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
      depositTxHash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef${Date.now()}`,
      depositTxChainId: 137,
    };

    const response = await axios.post('http://localhost:4000/graphql', {
      query: createCauseQuery,
      variables,
    });
    const errorMsg = response.data.errors?.[0]?.message;
    assert.isOk(errorMsg, 'Error message should be defined');
    assert.equal(errorMsg, 'unAuthorized');
  });

  it('should fail with invalid project count', async () => {
    const user = await saveUserDirectlyToDb(`0x123${Date.now()}`);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(`test-project-invalid-count-${Date.now()}`),
      slug: `test-project-invalid-count-${Date.now()}`,
    });
    const token = await generateTestAccessToken(user.id);

    const variables = {
      title: `Test Cause ${Date.now()}`,
      description: 'Test Description',
      chainId: 137,
      projectIds: [project.id], // Less than 5 projects
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
      depositTxHash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef${Date.now()}`,
      depositTxChainId: 137,
    };

    const response = await axios.post(
      'http://localhost:4000/graphql',
      {
        query: createCauseQuery,
        variables,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    const errorMsg = response.data.errors?.[0]?.message;
    assert.isOk(errorMsg, 'Error message should be defined');
    assert.equal(errorMsg, 'Invalid project count');

    // Clean up test data
    await deleteProjectDirectlyFromDb(project.id);
    await User.getRepository().query(
      'DELETE FROM "user" WHERE "walletAddress" = $1',
      [user.walletAddress],
    );
  });

  it('should fail with missing required fields', async () => {
    const user = await saveUserDirectlyToDb(`0x123${Date.now()}`);
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-missing-${Date.now()}-${index}`),
            slug: `test-project-missing-${Date.now()}-${index}`,
          }),
        ),
    );
    const token = await generateTestAccessToken(user.id);

    const variables = {
      title: '', // Empty title
      description: 'Test Description',
      chainId: 137,
      projectIds: projects.map(p => p.id),
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
      depositTxHash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef${Date.now()}`,
      depositTxChainId: 137,
    };

    const response = await axios.post(
      'http://localhost:4000/graphql',
      {
        query: createCauseQuery,
        variables,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    const errorMsg = response.data.errors?.[0]?.message;
    assert.isOk(errorMsg, 'Error message should be defined');
    assert.equal(errorMsg, 'Invalid input');

    // Clean up test data
    for (const project of projects) {
      await deleteProjectDirectlyFromDb(project.id);
    }
    await User.getRepository().query(
      'DELETE FROM "user" WHERE "walletAddress" = $1',
      [user.walletAddress],
    );
  });

  it('should fail with invalid chain ID', async () => {
    const user = await saveUserDirectlyToDb(`0x123${Date.now()}`);
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-chain-${Date.now()}-${index}`),
            slug: `test-project-chain-${Date.now()}-${index}`,
          }),
        ),
    );
    const token = await generateTestAccessToken(user.id);

    const variables = {
      title: `Test Cause ${Date.now()}`,
      description: 'Test Description',
      chainId: 1234, // Invalid chain ID
      projectIds: projects.map(p => p.id),
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
      depositTxHash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef${Date.now()}`,
      depositTxChainId: 137,
    };

    const response = await axios.post(
      'http://localhost:4000/graphql',
      {
        query: createCauseQuery,
        variables,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    const errorMsg = response.data.errors?.[0]?.message;
    assert.isOk(errorMsg, 'Error message should be defined');
    assert.equal(errorMsg, 'Invalid chain id');

    // Clean up test data
    for (const project of projects) {
      await deleteProjectDirectlyFromDb(project.id);
    }
    await User.getRepository().query(
      'DELETE FROM "user" WHERE "walletAddress" = $1',
      [user.walletAddress],
    );
  });

  it('should fail with invalid transaction hash', async () => {
    const user = await saveUserDirectlyToDb(`0x123${Date.now()}`);
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-tx-${Date.now()}-${index}`),
            slug: `test-project-tx-${Date.now()}-${index}`,
          }),
        ),
    );
    const token = await generateTestAccessToken(user.id);

    const variables = {
      title: `Test Cause ${Date.now()}`,
      description: 'Test Description',
      chainId: 137,
      projectIds: projects.map(p => p.id),
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
      depositTxHash: '', // Empty transaction hash
      depositTxChainId: 137,
    };

    const response = await axios.post(
      'http://localhost:4000/graphql',
      {
        query: createCauseQuery,
        variables,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );

    const errorMsg = response.data.errors?.[0]?.message;
    assert.isOk(errorMsg, 'Error message should be defined');
    assert.equal(errorMsg, 'Invalid txHash');

    // Clean up test data
    for (const project of projects) {
      await deleteProjectDirectlyFromDb(project.id);
    }
    await User.getRepository().query(
      'DELETE FROM "user" WHERE "walletAddress" = $1',
      [user.walletAddress],
    );
  });

  it('should fail when transaction hash is already used', async () => {
    const user = await saveUserDirectlyToDb(`0x123${Date.now()}`);
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-tx-dup-${Date.now()}-${index}`),
            slug: `test-project-tx-dup-${Date.now()}-${index}`,
          }),
        ),
    );
    const token = await generateTestAccessToken(user.id);

    const txHash = `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef${Date.now()}`;

    // First create a cause with the transaction hash
    await axios.post(
      'http://localhost:4000/graphql',
      {
        query: createCauseQuery,
        variables: {
          title: `First Cause ${Date.now()}`,
          description: 'First Description',
          chainId: 137,
          projectIds: projects.map(p => p.id),
          mainCategory: 'test',
          subCategories: ['sub1', 'sub2'],
          depositTxHash: txHash,
          depositTxChainId: 137,
        },
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );

    // Try to create another cause with the same transaction hash
    const response = await axios.post(
      'http://localhost:4000/graphql',
      {
        query: createCauseQuery,
        variables: {
          title: `Second Cause ${Date.now()}`,
          description: 'Second Description',
          chainId: 137,
          projectIds: projects.map(p => p.id),
          mainCategory: 'test',
          subCategories: ['sub1', 'sub2'],
          depositTxHash: txHash,
          depositTxChainId: 137,
        },
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );

    const errorMsg = response.data.errors?.[0]?.message;
    assert.isOk(errorMsg, 'Error message should be defined');
    assert.equal(errorMsg, 'Transaction hash already used in another cause');

    // Clean up test data
    await Cause.getRepository().query(
      'DELETE FROM "project_causes_cause" WHERE "causeId" IN (SELECT id FROM "cause" WHERE "title" LIKE $1)',
      ['First Cause%'],
    );
    await Cause.getRepository().query(
      'DELETE FROM "cause" WHERE "title" LIKE $1',
      ['First Cause%'],
    );
    for (const project of projects) {
      await deleteProjectDirectlyFromDb(project.id);
    }
    await User.getRepository().query(
      'DELETE FROM "user" WHERE "walletAddress" = $1',
      [user.walletAddress],
    );
  });
});

describe('causes() test cases', () => {
  let user: User;
  let projects: Project[];
  let token: string;
  let causes: any[];

  beforeEach(async () => {
    // Create test user and projects
    user = await saveUserDirectlyToDb(`0x123${Date.now()}`);
    projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-${Date.now()}-${index}`),
            slug: `test-project-${Date.now()}-${index}`,
          }),
        ),
    );
    token = await generateTestAccessToken(user.id);
    // Create multiple causes
    causes = [];
    for (let i = 0; i < 3; i++) {
      const response = await axios.post(
        'http://localhost:4000/graphql',
        {
          query: createCauseQuery,
          variables: {
            title: `Test Cause ${Date.now()}-${i}`,
            description: `Test Description ${i}`,
            chainId: 137,
            projectIds: projects.map(p => p.id),
            mainCategory: 'test',
            subCategories: ['sub1', 'sub2'],
            depositTxHash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef${i}${Date.now()}`,
            depositTxChainId: 137,
          },
        },
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        },
      );
      causes.push(response.data.data.createCause);
    }
  });

  afterEach(async () => {
    // Clean up test data
    await Cause.getRepository().query(
      'DELETE FROM "project_causes_cause" WHERE "causeId" IN (SELECT id FROM "cause" WHERE "title" LIKE $1)',
      ['Test Cause%'],
    );
    await Cause.getRepository().query(
      'DELETE FROM "cause" WHERE "title" LIKE $1',
      ['Test Cause%'],
    );
    for (const project of projects) {
      await deleteProjectDirectlyFromDb(project.id);
    }
    await User.getRepository().query(
      'DELETE FROM "user" WHERE "walletAddress" = $1',
      [user.walletAddress],
    );
  });

  it('should return all causes with relations', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: causesQuery,
      variables: {},
    });

    const returnedCauses = response.data.data.causes;
    assert.equal(returnedCauses.length, 3);
    assert.equal(returnedCauses[0].owner.id, user.id);
    assert.equal(returnedCauses[0].projects.length, 5);
    assert.equal(returnedCauses[0].activeProjectsCount, 5);
  });

  it('should respect limit parameter', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: causesQuery,
      variables: {
        limit: 2,
      },
    });

    const returnedCauses = response.data.data.causes;
    assert.equal(returnedCauses.length, 2);
  });

  it('should respect offset parameter', async () => {
    const firstCauseResponse = await axios.post(
      'http://localhost:4000/graphql',
      {
        query: causesQuery,
        variables: {
          limit: 1,
        },
      },
    );
    const firstCause = firstCauseResponse.data.data.causes[0];

    const response = await axios.post('http://localhost:4000/graphql', {
      query: causesQuery,
      variables: {
        offset: 1,
      },
    });

    const returnedCauses = response.data.data.causes;
    assert.equal(returnedCauses.length, 2);
    assert.notEqual(returnedCauses[0].id, firstCause.id);
    assert.notEqual(returnedCauses[1].id, firstCause.id);
  });

  it('should respect both limit and offset parameters', async () => {
    const firstCauseResponse = await axios.post(
      'http://localhost:4000/graphql',
      {
        query: causesQuery,
        variables: {
          limit: 1,
        },
      },
    );
    const firstCause = firstCauseResponse.data.data.causes[0];

    const response = await axios.post('http://localhost:4000/graphql', {
      query: causesQuery,
      variables: {
        limit: 1,
        offset: 1,
      },
    });

    const returnedCauses = response.data.data.causes;
    assert.equal(returnedCauses.length, 1);
    assert.notEqual(returnedCauses[0].id, firstCause.id);
  });

  it('should return causes in descending order by createdAt', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: causesQuery,
      variables: {},
    });

    const returnedCauses = response.data.data.causes;
    assert.equal(returnedCauses.length, 3);
    // Most recent cause should be first
    assert.equal(returnedCauses[0].id, causes[2].id);
    assert.equal(returnedCauses[1].id, causes[1].id);
    assert.equal(returnedCauses[2].id, causes[0].id);
  });
});

describe('cause() test cases', () => {
  let user: User;
  let projects: Project[];
  let token: string;
  let createdCause: any;

  beforeEach(async () => {
    // Create test user and projects
    user = await saveUserDirectlyToDb(`0x123${Date.now()}`);
    projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-${Date.now()}-${index}`),
            slug: `test-project-${Date.now()}-${index}`,
          }),
        ),
    );
    token = await generateTestAccessToken(user.id);

    // Create a cause
    const response = await axios.post(
      'http://localhost:4000/graphql',
      {
        query: createCauseQuery,
        variables: {
          title: `Test Cause ${Date.now()}`,
          description: 'Test Description',
          chainId: 137,
          projectIds: projects.map(p => p.id),
          mainCategory: 'test',
          subCategories: ['sub1', 'sub2'],
          depositTxHash: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef${Date.now()}`,
          depositTxChainId: 137,
        },
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    createdCause = response.data.data.createCause;
  });

  afterEach(async () => {
    // Clean up test data
    await Cause.getRepository().query(
      'DELETE FROM "project_causes_cause" WHERE "causeId" IN (SELECT id FROM "cause" WHERE "title" LIKE $1)',
      ['Test Cause%'],
    );
    await Cause.getRepository().query(
      'DELETE FROM "cause" WHERE "title" LIKE $1',
      ['Test Cause%'],
    );
    for (const project of projects) {
      await deleteProjectDirectlyFromDb(project.id);
    }
    await User.getRepository().query(
      'DELETE FROM "user" WHERE "walletAddress" = $1',
      [user.walletAddress],
    );
  });

  it('should return cause by id with relations', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: causeByIdQuery,
      variables: {
        id: Number(createdCause.id),
      },
    });

    const cause = response.data.data.cause;
    assert.isOk(cause);
    assert.equal(cause.id, createdCause.id);
    assert.equal(cause.title, createdCause.title);
    assert.equal(cause.description, createdCause.description);
    assert.equal(cause.chainId, createdCause.chainId);
    assert.equal(cause.mainCategory, createdCause.mainCategory);
    assert.deepEqual(cause.subCategories, createdCause.subCategories);
    assert.equal(cause.status, createdCause.status);
    assert.equal(cause.owner.id, user.id);
    assert.equal(cause.projects.length, 5);
    assert.equal(cause.activeProjectsCount, 5);
  });

  it('should return null for non-existent cause id', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: causeByIdQuery,
      variables: {
        id: 999999,
      },
    });

    const cause = response.data.data.cause;
    assert.isNull(cause);
  });

  it('should include all required fields in response', async () => {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: causeByIdQuery,
      variables: {
        id: Number(createdCause.id),
      },
    });

    const cause = response.data.data.cause;
    assert.isNotNull(cause);
    assert.isNotNull(cause.id);
    assert.isNotNull(cause.title);
    assert.isNotNull(cause.description);
    assert.isNotNull(cause.chainId);
    assert.isNotNull(cause.fundingPoolAddress);
    assert.isNotNull(cause.causeId);
    assert.isNotNull(cause.mainCategory);
    assert.isNotNull(cause.subCategories);
    assert.isNotNull(cause.status);
    assert.isNotNull(cause.listingStatus);
    assert.isNotNull(cause.totalRaised);
    assert.isNotNull(cause.totalDistributed);
    assert.isNotNull(cause.totalDonated);
    assert.isNotNull(cause.activeProjectsCount);
    assert.isNotNull(cause.createdAt);
    assert.isNotNull(cause.updatedAt);
    assert.isNotNull(cause.owner);
    assert.isNotNull(cause.projects);
  });
});
