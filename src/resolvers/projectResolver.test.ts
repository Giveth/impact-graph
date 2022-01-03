import { expect } from 'chai';
import 'mocha';
import { createServerWithDummyUser } from '../server/testServerFactory';
import { createTestClient } from 'apollo-server-testing';
import { ADD_PROJECT } from './graphqlApi/project';

let apolloServer;

describe('Test Project Resolver', () => {
  it('Create Project', async () => {
    const { query, mutate } = createTestClient(apolloServer);

    const sampleProject = {
      title: 'title1',
    };
    const result = await mutate({
      mutation: ADD_PROJECT,
      variables: {
        project: sampleProject,
      },
    });

    // const createProject = result.data.addProject

    // expect(sampleProject.title).to.eq(createProject.title);
  });
});

before(async () => {
  apolloServer = await createServerWithDummyUser();
});
