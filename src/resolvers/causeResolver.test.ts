import { assert } from 'chai';
import axios from 'axios';
import {
  saveUserDirectlyToDb,
  saveProjectDirectlyToDb,
  createProjectData,
  generateTestAccessToken,
} from '../../test/testUtils';
import { createCauseQuery } from '../../test/graphqlQueries';

const isValidCauseTitleQuery = `
query IsValidCauseTitle($title: String!) {
  isValidCauseTitle(title: $title)
}`;

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

  it('should throw error for existing title', async () => {
    // First create a cause with a specific title
    const user = await saveUserDirectlyToDb('0x123');
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-${index}`),
            slug: `test-project-${index}`,
          }),
        ),
    );
    const token = await generateTestAccessToken(user.id);

    const causeTitle = 'Existing Test Cause Title';
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
    assert.equal(errorMsg, 'Cause already exists');
  });
});

describe('createCause() test cases', () => {
  it('should create cause successfully with valid input', async () => {
    const user = await saveUserDirectlyToDb('0x123');
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-${index}`),
            slug: `test-project-${index}`,
          }),
        ),
    );
    const token = await generateTestAccessToken(user.id);

    const variables = {
      title: 'Test Cause',
      description: 'Test Description',
      chainId: 137,
      projectIds: projects.map(p => p.id),
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
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
    assert.equal(cause.title, 'Test Cause');
    assert.equal(cause.description, 'Test Description');
    assert.equal(cause.chainId, 137);
    assert.equal(cause.mainCategory, 'test');
    assert.deepEqual(cause.subCategories, ['sub1', 'sub2']);
    assert.equal(cause.status, 'PENDING');
    assert.equal(cause.owner.id, user.id);
    assert.equal(cause.projects.length, 5);
    assert.equal(cause.activeProjectsCount, 5);
  });

  it('should fail when user is not authenticated', async () => {
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-auth-${index}`),
            slug: `test-project-auth-${index}`,
          }),
        ),
    );

    const variables = {
      title: 'Test Cause',
      description: 'Test Description',
      chainId: 137,
      projectIds: projects.map(p => p.id),
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
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
    const user = await saveUserDirectlyToDb('0x123');
    const project = await saveProjectDirectlyToDb({
      ...createProjectData('test-project-invalid-count'),
      slug: 'test-project-invalid-count',
    });
    const token = await generateTestAccessToken(user.id);

    const variables = {
      title: 'Test Cause',
      description: 'Test Description',
      chainId: 137,
      projectIds: [project.id], // Less than 5 projects
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
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
  });

  it('should fail with missing required fields', async () => {
    const user = await saveUserDirectlyToDb('0x123');
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-missing-${index}`),
            slug: `test-project-missing-${index}`,
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
  });

  it('should fail with invalid chain ID', async () => {
    const user = await saveUserDirectlyToDb('0x123');
    const projects = await Promise.all(
      Array(5)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createProjectData(`test-project-chain-${index}`),
            slug: `test-project-chain-${index}`,
          }),
        ),
    );
    const token = await generateTestAccessToken(user.id);

    const variables = {
      title: 'Test Cause',
      description: 'Test Description',
      chainId: 1234, // Invalid chain ID
      projectIds: projects.map(p => p.id),
      mainCategory: 'test',
      subCategories: ['sub1', 'sub2'],
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
  });
});
