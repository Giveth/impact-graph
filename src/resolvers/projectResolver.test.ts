import axios from 'axios';
import { assert, expect } from 'chai';
import {
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { User } from '../entities/user';
import { createProjectQuery } from '../../test/graphqlQueries';
import {
  CreateProjectInput,
  ProjectTeamMemberInput,
} from './types/project-input';
import { getAbcLauncherAdapter } from '../adapters/adaptersFactory';

describe('ProjectCreate test', createProjectTestCases);

function createProjectTestCases() {
  let user: User;
  let accessToken: string;

  beforeEach(async () => {
    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    accessToken = await generateTestAccessToken(user.id);
  });

  it('should create project with team members successfully', async () => {
    assert.isOk(user);
    assert.isOk(accessToken);

    const teamMembers: ProjectTeamMemberInput[] = [
      {
        name: 'John Doe',
        image: 'https://example.com/john-doe.jpg',
        twitter: 'https://twitter.com/johndoe',
        linkedin: 'https://linkedin.com/johndoe',
        farcaster: 'https://farcaster.com/johndoe',
      },
      {
        name: 'Jane Doe',
        image: 'https://example.com/jane-doe.jpg',
        twitter: 'https://twitter.com/janedoe',
        linkedin: 'https://linkedin.com/janedoe',
        farcaster: 'https://farcaster.com/janedoe',
      },
    ];

    const projectAddress = generateRandomEtheriumAddress();
    const createProjectInput: CreateProjectInput = {
      title: 'Test Create Project 1',
      adminUserId: user.id,
      description: 'Test Project Description',
      categories: [],
      image: 'https://example.com/test-project.jpg',
      teaser: 'https://example.com/test-project-teaser.jpg',
      impactLocation: 'Test Impact Location',
      isDraft: false,
      teamMembers,
      address: projectAddress,
    };

    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: createProjectInput,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.createProject;
    assert.isOk(project);
    expect(project.teamMembers).to.deep.equal(teamMembers);
    const expectedAbc =
      await getAbcLauncherAdapter().getProjectAbcLaunchData(projectAddress);
    expect(project.abc).to.deep.equal(expectedAbc);
  });
}
