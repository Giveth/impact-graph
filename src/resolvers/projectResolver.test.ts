import { assert, expect } from 'chai';
import 'mocha';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  PROJECT_UPDATE_SEED_DATA,
  REACTION_SEED_DATA,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
  sleep,
} from '../../test/testUtils';
import axios from 'axios';
import {
  activateProjectQuery,
  deactivateProjectQuery,
  fetchAllProjectsQuery,
  fetchLikedProjectsQuery,
  fetchProjectUpdatesQuery,
  fetchSimilarProjectsBySlugQuery,
  fetchProjectsBySlugQuery,
  projectByIdQuery,
  walletAddressIsValid,
  projectsByUserIdQuery,
  createProjectQuery,
  updateProjectQuery,
  getProjectsAcceptTokensQuery,
  deleteProjectUpdateQuery,
  getPurpleList,
  editProjectUpdateQuery,
  addProjectUpdateQuery,
  walletAddressIsPurpleListed,
} from '../../test/graphqlQueries';
import { CreateProjectInput, ProjectInput } from './types/project-input';
import { errorMessages } from '../utils/errorMessages';
import {
  OrderField,
  Project,
  ProjStatus,
  ProjectUpdate,
} from '../entities/project';
import { Category } from '../entities/category';
import { Reaction } from '../entities/reaction';
import { ProjectStatus } from '../entities/projectStatus';
import { ProjectStatusHistory } from '../entities/projectStatusHistory';
import { User } from '../entities/user';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { Token } from '../entities/token';
import { PurpleAddress } from '../entities/purpleAddress';
import { Float } from 'type-graphql';

describe('createProject test cases --->', createProjectTestCases);
describe('updateProject test cases --->', updateProjectTestCases);

describe('projects test cases --->', projectsTestCases);
describe('projectsByUserId test cases --->', projectsByUserIdTestCases);

describe('deactivateProject test cases --->', deactivateProjectTestCases);
describe('activateProject test cases --->', activateProjectTestCases);

describe('getProjectUpdates test cases --->', getProjectUpdatesTestCases);
describe(
  'likedProjectsByUserId test cases --->',
  likedProjectsByUserIdTestCases,
);
describe('projectBySlug test cases --->', projectBySlugTestCases);
describe('projectById test cases --->', projectByIdTestCases);
describe('getPurpleList test cases --->', getPurpleListTestCases);
describe(
  'walletAddressIsPurpleListed Test Cases --->',
  walletAddressIsPurpleListedTestCases,
);

describe('walletAddressIsValid test cases --->', walletAddressIsValidTestCases);
// TODO We should implement test cases for below query/mutation
// describe('topProjects test cases --->', topProjectsTestCases);
// describe('project test cases --->', projectTestCases);
// describe('uploadImage test cases --->', uploadImageTestCases);
describe('addProjectUpdate test cases --->', addProjectUpdateTestCases);
describe('editProjectUpdate test cases --->', editProjectUpdateTestCases);
describe('deleteProjectUpdate test cases --->', deleteProjectUpdateTestCases);
// describe('getProjectsRecipients test cases --->', getProjectsRecipientsTestCases);
// describe('getProjectReactions test cases --->', getProjectReactionsTestCases);
// describe('isValidTitleForProject test cases --->', isValidTitleForProjectTestCases);
// describe('projectByAddress test cases --->', projectByAddressTestCases);
describe(
  'likedProjectsByUserId test cases --->',
  likedProjectsByUserIdTestCases,
);
describe(
  'similarProjectsBySlug test cases --->',
  similarProjectsBySlugTestCases,
);

describe(
  'getProjectsAcceptTokens() test cases --->',
  getProjectsAcceptTokensTestCases,
);
// We may can delete this query
// describe('updateProjectStatus test cases --->', updateProjectStatusTestCases);

// describe('activateProject test cases --->', activateProjectTestCases);

function getProjectsAcceptTokensTestCases() {
  it('should return all tokens for giveth projects', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const allTokens = await Token.find({});
    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isOk(result.data.data.getProjectAcceptTokens);
    assert.equal(
      result.data.data.getProjectAcceptTokens.length,
      allTokens.length,
    );
  });
  it('should return all tokens for trace projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const traceOrganization = (await Organization.findOne({
      label: ORGANIZATION_LABELS.TRACE,
    })) as Organization;

    const allTokens = (
      await Token.query(`
      SELECT COUNT(*) as "tokenCount"
      FROM organization_tokens_token
      WHERE "organizationId" = ${traceOrganization.id}
    `)
    )[0];
    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isOk(result.data.data.getProjectAcceptTokens);
    assert.equal(
      result.data.data.getProjectAcceptTokens.length,
      Number(allTokens.tokenCount),
    );
  });
  it('should just return ETH token for givingBlock projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const allTokens = await Token.find({});
    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isOk(result.data.data.getProjectAcceptTokens);
    assert.equal(result.data.data.getProjectAcceptTokens.length, 1);
    assert.equal(result.data.data.getProjectAcceptTokens[0].symbol, 'ETH');
    assert.equal(result.data.data.getProjectAcceptTokens[0].networkId, 1);
  });
}

function projectsTestCases() {
  it('should return projects search by owner', async () => {
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        searchTerm: SEED_DATA.SECOND_USER.name,
      },
    });

    const projects = result.data.data.projects.projects;
    const secondUserProjects = await Project.find({
      admin: String(SEED_DATA.SECOND_USER.id),
    });

    assert.equal(projects.length, secondUserProjects.length);
    assert.equal(Number(projects[0]?.admin), SEED_DATA.SECOND_USER.id);
  });

  it('should return projects with current take', async () => {
    const take = 1;
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        take,
      },
    });
    const projects = result.data.data.projects.projects;
    assert.equal(projects.length, take);
    assert.isNull(projects[0]?.reaction);
  });

  it('should return projects with correct reaction', async () => {
    const take = 1;
    const USER_DATA = SEED_DATA.FIRST_USER;

    // Project has not been liked
    let result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        take,
        searchTerm: SEED_DATA.SECOND_PROJECT.title,
        connectedWalletUserId: USER_DATA.id,
      },
    });

    let projects = result.data.data.projects.projects;
    assert.equal(projects.length, take);
    assert.isNull(projects[0]?.reaction);

    // Project has been liked, but connectedWalletUserIs is not filled
    result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        take,
        searchTerm: SEED_DATA.FIRST_PROJECT.title,
      },
    });

    projects = result.data.data.projects.projects;
    assert.equal(projects.length, take);
    assert.isNull(projects[0]?.reaction);

    // Project has been liked
    result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        take,
        searchTerm: SEED_DATA.FIRST_PROJECT.title,
        connectedWalletUserId: USER_DATA.id,
      },
    });

    projects = result.data.data.projects.projects;
    assert.equal(projects.length, take);
    assert.equal(
      projects[0]?.reaction?.id,
      REACTION_SEED_DATA.FIRST_LIKED_PROJECT_REACTION.id,
    );
  });

  it('should return projects, sort by creationDate, DESC', async () => {
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'CreationDate',
          direction: 'DESC',
        },
      },
    });
    assert.equal(
      Number(result.data.data.projects.projects[0].id),
      secondProject.id,
    );
    assert.equal(
      Number(result.data.data.projects.projects[1].id),
      firstProject.id,
    );
  });
  it('should return projects, sort by creationDate, ASC', async () => {
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'CreationDate',
          direction: 'ASC',
        },
      },
    });
    const projectsCount = result.data.data.projects.projects.length;
    const firstProjectIsOlder =
      new Date(result.data.data.projects.projects[0].creationDate) <
      new Date(
        result.data.data.projects.projects[projectsCount - 1].creationDate,
      );
    assert.isTrue(firstProjectIsOlder);
  });
  it('should return projects, sort by updatedAt, DESC', async () => {
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'UpdatedAt',
          direction: 'DESC',
        },
      },
    });
    assert.isTrue(
      result.data.data.projects.projects[0].updatedAt >
        result.data.data.projects.projects[1].updatedAt,
    );
  });
  it('should return projects, sort by updatedAt, ASC', async () => {
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'UpdatedAt',
          direction: 'ASC',
        },
      },
    });
    const projectsCount = result.data.data.projects.projects.length;
    assert.isTrue(
      new Date(result.data.data.projects.projects[0].updatedAt) <=
        new Date(
          result.data.data.projects.projects[projectsCount - 1].updatedAt,
        ),
    );
    assert.isTrue(
      new Date(
        result.data.data.projects.projects[projectsCount - 2].updatedAt,
      ) <=
        new Date(
          result.data.data.projects.projects[projectsCount - 1].updatedAt,
        ),
    );
  });
  it('should return projects, sort by qualityScore, DESC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),

      // it should be more than any project
      qualityScore: 100,
    });
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'QualityScore',
          direction: 'DESC',
        },
      },
    });
    assert.equal(result.data.data.projects.projects[0].qualityScore, 100);
    assert.isTrue(
      result.data.data.projects.projects[0].qualityScore >=
        result.data.data.projects.projects[1].qualityScore,
    );
  });
  it('should return projects, sort by qualityScore, ASC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),

      qualityScore: 100,
    });
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'QualityScore',
          direction: 'ASC',
        },
      },
    });
    assert.equal(result.data.data.projects.projects[0].qualityScore, 0);
    assert.isTrue(
      result.data.data.projects.projects[0].qualityScore <=
        result.data.data.projects.projects[1].qualityScore,
    );
  });
  it('should return projects, sort by verified, DESC', async () => {
    // There is two verified projects so I just need to create a project with verified: false and listed:true
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'Verified',
          direction: 'DESC',
        },
      },
    });
    const projects = result.data.data.projects.projects;
    assert.isTrue(projects[0].verified);
    assert.isTrue(
      projects[0].creationDate > projects[projects.length - 1].creationDate,
    );
  });
  it('should return projects, sort by verified, ASC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'Verified',
          direction: 'ASC',
        },
      },
    });
    const projects = result.data.data.projects.projects;
    assert.isTrue(projects[0].verified);
    assert.isTrue(
      projects[0].creationDate < projects[projects.length - 1].creationDate,
    );
  });
  it('should return projects, filter by verified, true', async () => {
    // There is two verified projects so I just need to create a project with verified: false and listed:true
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        filterBy: {
          field: 'Verified',
          value: true,
        },
      },
    });
    assert.isTrue(result.data.data.projects.projects[0].verified);
    assert.isTrue(
      result.data.data.projects.projects[
        result.data.data.projects.projects.length - 1
      ].verified,
    );
  });
  it('should return projects, filter by verified, false', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        filterBy: {
          field: 'Verified',
          value: false,
        },
      },
    });
    assert.isNotTrue(result.data.data.projects.projects[0].verified);
    assert.isNotTrue(
      result.data.data.projects.projects[
        result.data.data.projects.projects.length - 1
      ].verified,
    );
  });
  it('should return projects, sort by traceable, DESC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      traceCampaignId: '1234',
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'Traceable',
          direction: 'DESC',
        },
      },
    });
    assert.isFalse(
      result.data.data.projects.projects.some(p => !p.traceCampaignId),
    );
  });
  it('should return projects, sort by traceable, ASC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'Traceable',
          direction: 'ASC',
        },
      },
    });
    assert.isFalse(
      result.data.data.projects.projects.some(p => !!p.traceCampaignId),
    );
  });
  it('should return projects, filter by traceable, true', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      traceCampaignId: '1234',
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        filterBy: {
          field: 'Traceable',
          value: true,
        },
      },
    });
    assert.exists(result.data.data.projects.projects[0].traceCampaignId);
    assert.exists(
      result.data.data.projects.projects[
        result.data.data.projects.projects.length - 1
      ].traceCampaignId,
    );
  });
  it('should return projects, filter by traceable, false', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        filterBy: {
          field: 'Traceable',
          value: false,
        },
      },
    });
    assert.notExists(result.data.data.projects.projects[0].traceCampaignId);
    assert.notExists(
      result.data.data.projects.projects[
        result.data.data.projects.projects.length - 1
      ].traceCampaignId,
    );
  });
  it('should return projects, sort by reactions, DESC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      totalReactions: 100,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'Reactions',
          direction: 'DESC',
        },
      },
    });
    assert.isTrue(result.data.data.projects.projects[0].totalReactions >= 100);
  });
  it('should return projects, sort by reactions, ASC', async () => {
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'Reactions',
          direction: 'ASC',
        },
      },
    });
    assert.equal(result.data.data.projects.projects[0].totalReactions, 0);
  });
  it('should return projects, sort by donations, DESC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      totalDonations: 100,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'Donations',
          direction: 'DESC',
        },
      },
    });
    assert.isTrue(result.data.data.projects.projects[0].totalDonations >= 100);
  });
  it('should return projects, sort by donations, ASC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      totalDonations: 0,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'Donations',
          direction: 'ASC',
        },
      },
    });
    assert.equal(result.data.data.projects.projects[0].totalDonations, 0);
  });
  it('should return projects, sort by totalTraceDonations, DESC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      totalTraceDonations: 100,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'TraceDonations',
          direction: 'DESC',
        },
      },
    });
    assert.isTrue(
      result.data.data.projects.projects[0].totalTraceDonations >= 100,
    );
  });
  it('should return projects, sort by totalTraceDonations, ASC', async () => {
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'TraceDonations',
          direction: 'ASC',
        },
      },
    });
    assert.equal(result.data.data.projects.projects[0].totalTraceDonations, 0);
  });

  // TODO this test doesnt pass now, but we should fix it
  // it('should return projects, find by category', async () => {
  //   const category = 'food7';
  //   await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     title: String(new Date().getTime()),
  //     categories: [category],
  //   });
  //   const result = await axios.post(graphqlUrl, {
  //     query: fetchAllProjectsQuery,
  //     variables: {
  //       category: [category],
  //     },
  //   });
  //   assert.equal(
  //     result.data.data.projects.projects[0].categories[0].name,
  //     category,
  //   );
  // });

  // TODO this test doesnt pass now, but we should fix it
  // it('should return projects, find by searchItem', async () => {
  //   const title = 'Project witt test title, should return it';
  //   await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     title,
  //   });
  //   const result = await axios.post(graphqlUrl, {
  //     query: fetchAllProjectsQuery,
  //     variables: {
  //       searchItem: title,
  //     },
  //   });
  //   assert.equal(result.data.data.projects.projects.length, 1);
  //   assert.equal(result.data.data.projects.projects[0].title, title);
  // });
}

function projectsByUserIdTestCases() {
  it('should return projects with specific admin', async () => {
    const userId = SEED_DATA.FIRST_USER.id;
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    const projectWithAnotherOwner = projects.find(
      project => Number(project.admin) !== userId,
    );
    assert.isNotOk(projectWithAnotherOwner);
  });

  it('should return projects with current take', async () => {
    const take = 1;
    const userId = SEED_DATA.FIRST_USER.id;
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        take,
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    assert.equal(projects.length, take);
  });

  it('should not return draft projects', async () => {
    const take = 1;
    const userId = SEED_DATA.FIRST_USER.id;
    const draftProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(SEED_DATA.FIRST_USER.id),
      statusId: ProjStatus.drafted,
    });
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        take,
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    assert.equal(projects.length, take);
    assert.isNotOk(projects.find(project => project.id === draftProject.id));
  });

  it('should not return not listed projects', async () => {
    const userId = SEED_DATA.FIRST_USER.id;
    const notListedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(SEED_DATA.FIRST_USER.id),
      listed: false,
    });
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    assert.isNotOk(
      projects.find(project => project.id === notListedProject.id),
    );
  });

  it('should not return new created active project', async () => {
    const userId = SEED_DATA.FIRST_USER.id;
    const activeProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    assert.equal(projects[0].id, activeProject.id);
  });
}

function createProjectTestCases() {
  it('Create Project should return <<Access denied>>, calling without token', async () => {
    const sampleProject = {
      title: 'title1',
    };
    const result = await axios.post(graphqlUrl, {
      query: createProjectQuery,
      variables: {
        project: sampleProject,
      },
    });

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should get error, invalid category', async () => {
    const sampleProject: ProjectInput = {
      title: String(new Date().getTime()),
      categories: ['invalid category'],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
    );
  });
  it('Should get error, when more than 5 categories sent', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: SEED_DATA.CATEGORIES,
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
    );
  });
  it('Should get error, when walletAddress of project is repetitive', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject, title: String(new Date().getTime()) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      addProjectResponse.data.errors[0].message,
      `Eth address ${sampleProject.walletAddress} is already being used for a project`,
    );
  });
  it('Should get error, when walletAddress of project is a smart contract address', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: SEED_DATA.DAI_SMART_CONTRACT_ADDRESS,
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject, title: String(new Date().getTime()) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      addProjectResponse.data.errors[0].message,
      `Eth address ${SEED_DATA.DAI_SMART_CONTRACT_ADDRESS} is a smart contract. We do not support smart contract wallets at this time because we use multiple blockchains, and there is a risk of your losing donations.`,
    );
  });
  it('Should get error, when title of project is repetitive', async () => {
    const sampleProject: CreateProjectInput = {
      title: SEED_DATA.FIRST_PROJECT.title,
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: {
            ...sampleProject,
            walletAddress: generateRandomEtheriumAddress(),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      addProjectResponse.data.errors[0].message,
      errorMessages.PROJECT_WITH_THIS_TITLE_EXISTS,
    );
  });
  it('Should create successfully', async () => {
    const sampleProject: CreateProjectInput = {
      title: 'title ' + new Date().getTime(),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.exists(result.data);
    assert.exists(result.data.data);
    assert.exists(result.data.data.createProject);
    assert.equal(result.data.data.createProject.title, sampleProject.title);
    assert.equal(
      result.data.data.createProject.organization.label,
      ORGANIZATION_LABELS.GIVETH,
    );

    // When creating project, listed is null by default
    assert.equal(result.data.data.createProject.listed, null);

    assert.equal(
      result.data.data.createProject.admin,
      String(SEED_DATA.FIRST_USER.id),
    );
    assert.equal(result.data.data.createProject.verified, false);
    assert.equal(
      result.data.data.createProject.status.id,
      String(ProjStatus.active),
    );
    assert.equal(
      result.data.data.createProject.description,
      sampleProject.description,
    );
    assert.equal(
      result.data.data.createProject.walletAddress,
      sampleProject.walletAddress,
    );
    assert.equal(
      result.data.data.createProject.adminUser.walletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    assert.equal(result.data.data.createProject.image, sampleProject.image);
    assert.equal(
      result.data.data.createProject.creationDate,
      result.data.data.createProject.updatedAt,
    );
  });

  it('Should create draft successfully', async () => {
    const sampleProject: ProjectInput = {
      title: 'draftTitle1 ' + new Date().getTime(),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      isDraft: true,
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.exists(result.data);
    assert.exists(result.data.data);
    assert.exists(result.data.data.createProject);
    assert.equal(result.data.data.createProject.title, sampleProject.title);
    assert.equal(
      result.data.data.createProject.organization.label,
      ORGANIZATION_LABELS.GIVETH,
    );

    // When creating project, listed is null by default
    assert.equal(result.data.data.createProject.listed, null);

    assert.equal(
      result.data.data.createProject.admin,
      String(SEED_DATA.FIRST_USER.id),
    );
    assert.equal(result.data.data.createProject.verified, false);
    assert.equal(
      result.data.data.createProject.status.id,
      String(ProjStatus.drafted),
    );
    assert.equal(
      result.data.data.createProject.description,
      sampleProject.description,
    );
    assert.equal(
      result.data.data.createProject.walletAddress,
      sampleProject.walletAddress,
    );
  });
}

function updateProjectTestCases() {
  it('Update Project should return <<Access denied>>, calling without token', async () => {
    const result = await axios.post(graphqlUrl, {
      query: updateProjectQuery,
      variables: {
        projectId: 1,
        newProjectData: {
          title: String(new Date().getTime()),
        },
      },
    });

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should get error when updating someone else project', async () => {
    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('Should get error when project not found', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          // A number that we can be sure there is not a project with this id
          projectId: 1_000_000,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      editProjectResult.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
  it('Should get error when sending more than 5 categories', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          newProjectData: {
            title: String(new Date().getTime()),
            categories: SEED_DATA.CATEGORIES,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.errors[0].message,
      errorMessages.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
    );
  });
  it('Should get error when sent walletAddress is repetitive', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          newProjectData: {
            walletAddress: SEED_DATA.SECOND_PROJECT.walletAddress,
            title: SEED_DATA.FIRST_PROJECT.title,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.errors[0].message,
      `Eth address ${SEED_DATA.SECOND_PROJECT.walletAddress} is already being used for a project`,
    );
  });
  it('Should get error when sent walletAddress is smartContractAddress', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          newProjectData: {
            walletAddress: SEED_DATA.DAI_SMART_CONTRACT_ADDRESS,
            title: SEED_DATA.FIRST_PROJECT.title,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.errors[0].message,
      `Eth address ${SEED_DATA.DAI_SMART_CONTRACT_ADDRESS} is a smart contract. We do not support smart contract wallets at this time because we use multiple blockchains, and there is a risk of your losing donations.`,
    );
  });
  it('Should get error when sent title is repetitive', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          newProjectData: {
            title: SEED_DATA.SECOND_PROJECT.title,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.errors[0].message,
      errorMessages.PROJECT_WITH_THIS_TITLE_EXISTS,
    );
  });
  it('Should update successfully when updating with old title', async () => {
    const sampleProject: ProjectInput = {
      title: 'test ' + String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const createProjectResult = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const newTitle = sampleProject.title.toUpperCase();
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(createProjectResult.data.data.createProject.id),
          newProjectData: {
            title: newTitle,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.title, newTitle);
    assert.equal(
      editProjectResult.data.data.updateProject.adminUser.walletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
  });
  it('Should update successfully and slugHistory would contain last slug', async () => {
    const title = 'test 123456';
    const slug = 'test-123456';
    const sampleProject: ProjectInput = {
      title,
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const createProjectResult = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const newTitle = `test` + new Date().getTime().toString();
    const newSlug = newTitle;
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(createProjectResult.data.data.createProject.id),
          newProjectData: {
            title: newTitle,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.title, newTitle);
    assert.equal(editProjectResult.data.data.updateProject.slug, newSlug);
    assert.isTrue(
      editProjectResult.data.data.updateProject.slugHistory.includes(slug),
    );
  });
  it('Should update successfully when sending current walletAddress', async () => {
    const sampleProject: ProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const createProjectResult = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(createProjectResult.data.data.createProject.id),
          newProjectData: {
            title: String(new Date().getTime()),
            walletAddress:
              createProjectResult.data.data.createProject.walletAddress,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.data.updateProject.walletAddress,
      createProjectResult.data.data.createProject.walletAddress,
    );
  });
  it('Should update successfully and verified(true) field would not change', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: true,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isTrue(editProjectResult.data.data.updateProject.verified);
  });
  it('Should update successfully and verified(false) field would not change', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isFalse(editProjectResult.data.data.updateProject.verified);
  });
  it('Should update successfully listed (true) should becomes null', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.listed, null);
  });
  it('Should update successfully listed (false) should becomes null', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.listed, null);
  });
  it('Should update image successfully', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb(createProjectData());
    const image =
      'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS';
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            image,
            title: new Date().getTime().toString(),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
  });
  it('Should update image successfully when sending empty string', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
    });
    const image = '';
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            image,
            title: new Date().getTime().toString(),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
  });
  it('Should change updatedAt when updating project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const image = '';
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: new Date().getTime().toString(),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(editProjectResult.data.data.updateProject);
    assert.notEqual(
      editProjectResult.data.data.updateProject.updatedAt,
      project.updatedAt,
    );
  });
  it('Should not update image when not sending it', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const image =
      'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS';
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      image,
    });
    const newTitle = new Date().getTime().toString();
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: newTitle,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
  });
  it('Should not change slug when updating description', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const image =
      'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS';
    const title = new Date().getTime().toString();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      image,
      title,
    });
    const newDescription = 'test description haahaaa';
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            description: newDescription,
            title,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
    assert.equal(editProjectResult.data.data.updateProject.title, title);
    assert.equal(editProjectResult.data.data.updateProject.slug, title);
    assert.equal(
      editProjectResult.data.data.updateProject.description,
      newDescription,
    );
  });
  it('Should change slug when updating title', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const image =
      'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS';
    const title = new Date().getTime().toString();
    const newTitle = `${title}new`;
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      image,
      title,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: newTitle,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
    assert.equal(editProjectResult.data.data.updateProject.title, newTitle);
    assert.equal(editProjectResult.data.data.updateProject.slug, newTitle);
    assert.isTrue(
      editProjectResult.data.data.updateProject.slugHistory.includes(title),
    );
  });
}

function deactivateProjectTestCases() {
  it('Deactivate Project should return <<Access denied>>, calling without token', async () => {
    const result = await axios.post(graphqlUrl, {
      query: deactivateProjectQuery,
      variables: {
        projectId: 1,
      },
    });

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should get error when deactivating someone else project', async () => {
    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );
    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT,
    );
  });
  it('Should get error when project not found', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: 1_000_000,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });

  it('Should get error when deactivating cancelled/deactivated project', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactiveStatus = await ProjectStatus.findOne({
      id: ProjStatus.cancelled,
    });
    project.status = deactiveStatus as ProjectStatus;
    await project.save();
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.THIS_PROJECT_IS_CANCELLED_OR_DEACTIVATED_ALREADY,
    );
  });

  it('Should deactivate project successfully', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
  });

  it('Should deactivate project successfully and create projectStatusHistory', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
          reasonId: 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    const projectStatusHistory = await ProjectStatusHistory.findOne({
      project,
    });
    assert.isOk(projectStatusHistory);
    assert.equal(projectStatusHistory?.reasonId, 1);
  });
  it('Should deactivate project successfully and create projectStatusHistory without reasonId', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    const projectStatusHistory = await ProjectStatusHistory.findOne({
      project,
    });
    assert.isOk(projectStatusHistory);
    assert.isNotOk(projectStatusHistory?.reasonId);
  });

  it('Should deactivate project successfully, wont affect listed(true)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    assert.isTrue(updatedProject?.listed);
  });

  it('Should deactivate project successfully, wont affect listed(false)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    assert.isFalse(updatedProject?.listed);
  });

  it('Should deactivate project successfully, wont affect verified(true)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: true,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    assert.isTrue(updatedProject?.verified);
  });

  it('Should deactivate project successfully, wont affect verified(false)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    assert.isFalse(updatedProject?.verified);
  });
}

function activateProjectTestCases() {
  it('Activate Project should return <<Access denied>>, calling without token', async () => {
    const result = await axios.post(graphqlUrl, {
      query: activateProjectQuery,
      variables: {
        projectId: 1,
      },
    });

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should get error when activating someone else project', async () => {
    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );
    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT,
    );
  });
  it('Should get error when project not found', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: 1_000_000,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });

  it('Should get error when Activating cancelled project', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactiveStatus = await ProjectStatus.findOne({
      id: ProjStatus.cancelled,
    });
    project.status = deactiveStatus as ProjectStatus;
    await project.save();
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.THIS_PROJECT_IS_CANCELLED_OR_DEACTIVATED_ALREADY,
    );
  });

  it('Should activate project successfully', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
  });

  it('Should activate draft project successfully', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.drafted,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
  });

  it('Should activate project successfully and create projectStatusHistory', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    const projectStatusHistory = await ProjectStatusHistory.findOne({
      project,
    });
    assert.isOk(projectStatusHistory);
    assert.isNotOk(projectStatusHistory?.reasonId);
  });

  it('Should activate project successfully,  should change listed from true to null', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      listed: true,
    });

    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    assert.isNull(updatedProject?.listed);
  });

  it('Should activate project successfully,  should change listed from false to null', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
      statusId: ProjStatus.deactive,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    assert.isNull(updatedProject?.listed);
  });

  it('Should activate project successfully, wont affect verified(true)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: true,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    assert.isTrue(updatedProject?.verified);
  });

  it('Should activate project successfully, wont affect verified(false)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      id: project.id,
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    assert.isFalse(updatedProject?.verified);
  });
}

function likedProjectsByUserIdTestCases() {
  it('should returns projects liked by the user', async () => {
    const take = 1;
    const result = await axios.post(graphqlUrl, {
      query: fetchLikedProjectsQuery,
      variables: {
        userId: SEED_DATA.FIRST_USER.id,
        take,
      },
    });

    const projects = result.data.data.likedProjectsByUserId.projects;
    assert.equal(projects.length, take);

    const reaction = await Reaction.findOne({
      userId: SEED_DATA.FIRST_USER.id,
      projectId: SEED_DATA.FIRST_PROJECT.id,
    });

    assert.equal(projects[0].id, reaction?.projectId);
    assert.equal(projects[0]?.reaction?.id, reaction?.id);
  });
  describe('if the user did not like any project', () => {
    it('should return an empty list', async () => {
      const result = await axios.post(graphqlUrl, {
        query: fetchLikedProjectsQuery,
        variables: {
          userId: SEED_DATA.SECOND_USER.id,
        },
      });

      const projects = result.data.data.likedProjectsByUserId.projects;
      assert.equal(projects.length, 0);
    });
  });
}

function walletAddressIsValidTestCases() {
  it('should return true for new ethereum address', async () => {
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: generateRandomEtheriumAddress(),
      },
    });
    assert.equal(result.data.data.walletAddressIsValid, true);
  });

  it('should throw error for invalid ethereum address', async () => {
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: '4297urofklshnforp2',
      },
    });
    assert.equal(
      result.data.errors[0].message,
      errorMessages.INVALID_WALLET_ADDRESS,
    );
  });

  it('should throw error for existing walletAddress', async () => {
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: SEED_DATA.FIRST_PROJECT.walletAddress,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      `Eth address ${SEED_DATA.FIRST_PROJECT.walletAddress} is already being used for a project`,
    );
  });
  it('should throw error walletAddress is smart contract address in mainnet', async () => {
    // DAI address https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f
    const walletAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: walletAddress,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      `Eth address ${walletAddress} is a smart contract. We do not support smart contract wallets at this time because we use multiple blockchains, and there is a risk of your losing donations.`,
    );
  });

  it('should throw error walletAddress is smart contract address in xdai', async () => {
    // GIV address https://blockscout.com/xdai/mainnet/token/0x4f4F9b8D5B4d0Dc10506e5551B0513B61fD59e75/token-transfers
    const walletAddress = '0x4f4F9b8D5B4d0Dc10506e5551B0513B61fD59e75';
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: walletAddress,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      `Eth address ${walletAddress} is a smart contract. We do not support smart contract wallets at this time because we use multiple blockchains, and there is a risk of your losing donations.`,
    );
  });

  it('should throw error for existing walletAddress - upperCase', async () => {
    const upperCaseWalletAddress = SEED_DATA.FIRST_PROJECT.walletAddress
      ?.toUpperCase()
      // This replace is because ethereum wallet address should begin with 0x ad toUpperCase make it corrupted
      .replace('0X', '0x') as string;
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: upperCaseWalletAddress,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      `Eth address ${upperCaseWalletAddress} is already being used for a project`,
    );
  });
  it('should throw error for existing walletAddress - lowerCase', async () => {
    const lowerCaseWalletAddress =
      SEED_DATA.FIRST_PROJECT.walletAddress?.toLowerCase();
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: lowerCaseWalletAddress,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      `Eth address ${lowerCaseWalletAddress} is already being used for a project`,
    );
  });
}

function projectByIdTestCases() {
  it('should return project with id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.equal(result.data.data.projectById.slug, project.slug);
  });
  it('should return error for invalid id', async () => {
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        // To make use id is invalid
        id: 9999999,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
  it('should return reaction when user liked the project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const reaction = await Reaction.create({
      userId: user.id,
      projectId: project.id,
      reaction: 'heart',
    }).save();
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,
        connectedWalletUserId: user.id,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.equal(result.data.data.projectById.reaction.id, reaction.id);
  });
  it('should not return reaction when user doesnt exist', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,

        // To make sure there is no user with that Id
        connectedWalletUserId: 9999999,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.isNotOk(result.data.data.projectById.reaction);
  });
  it('should not return reaction when user didnt like the project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,
        connectedWalletUserId: user.id,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.isNotOk(result.data.data.projectById.reaction);
  });
  it('should not return drafted projects if not logged in', async () => {
    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: draftedProject.id,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return drafted projects of logged in user', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: draftedProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectById;
    assert.equal(Number(project.id), draftedProject.id);
  });
  it('should not return drafted project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: draftedProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });

  it('should not return cancelled projects if not logged in', async () => {
    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: cancelledProject.id,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return cancelled projects of logged in user', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: cancelledProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectById;
    assert.equal(Number(project.id), cancelledProject.id);
  });
  it('should not return cancelled project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: cancelledProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
}

function walletAddressIsPurpleListedTestCases() {
  it('should return true if walletAddress is purpleListed', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await PurpleAddress.create({
      address: walletAddress,
      projectId: SEED_DATA.FIRST_PROJECT.id,
    }).save();
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress,
      },
    });
    assert.isTrue(result.data.data.walletAddressIsPurpleListed);
  });
  it('should return true if wallet address is from a verifiedProject', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress,
      },
    });
    assert.isTrue(result.data.data.walletAddressIsPurpleListed);
  });
  it('should return false if wallet address is from a nonverified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: false,
    });
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress,
      },
    });
    assert.isFalse(result.data.data.walletAddressIsPurpleListed);
  });
  it('should return false if its a random non related address', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress,
      },
    });
    assert.isFalse(result.data.data.walletAddressIsPurpleListed);
  });
}

function getPurpleListTestCases() {
  it('should return purpleAddress records', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await PurpleAddress.create({
      address: walletAddress,
      projectId: SEED_DATA.FIRST_PROJECT.id,
    }).save();
    const result = await axios.post(graphqlUrl, {
      query: getPurpleList,
    });
    assert.isOk(result.data.data.getPurpleList);
    assert.isTrue(
      result.data.data.getPurpleList.includes(walletAddress.toLowerCase()),
    );
  });
  it('should return verifiedProject wallet address', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    const result = await axios.post(graphqlUrl, {
      query: getPurpleList,
    });
    assert.isOk(result.data.data.getPurpleList);
    assert.isTrue(
      result.data.data.getPurpleList.includes(walletAddress.toLowerCase()),
    );
  });
  it('should not return non-verified project wallet address', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: false,
    });
    const result = await axios.post(graphqlUrl, {
      query: getPurpleList,
    });
    assert.isOk(result.data.data.getPurpleList);
    assert.isFalse(
      result.data.data.getPurpleList.includes(walletAddress.toLowerCase()),
    );
  });
}

function getProjectUpdatesTestCases() {
  it('should return project updates with current take', async () => {
    const take = 2;
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectUpdatesQuery,
      variables: {
        projectId: SEED_DATA.FIRST_PROJECT.id,
        take,
      },
    });
    assert.isOk(result);
    const projectUpdates = result.data.data.getProjectUpdates;
    assert.equal(projectUpdates.length, take);
  });

  it('should return correct reaction', async () => {
    const take = 3;
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectUpdatesQuery,
      variables: {
        projectId: SEED_DATA.FIRST_PROJECT.id,
        take,
        connectedWalletUserId: SEED_DATA.FIRST_USER.id,
      },
    });
    assert.isOk(result);
    const projectUpdates: ProjectUpdate[] = result.data.data.getProjectUpdates;

    const likedProject = projectUpdates.find(
      pu => +pu.id === PROJECT_UPDATE_SEED_DATA.FIRST_PROJECT_UPDATE.id,
    );
    const noLikedProject = projectUpdates.find(
      pu => +pu.id !== PROJECT_UPDATE_SEED_DATA.FIRST_PROJECT_UPDATE.id,
    );

    assert.equal(
      likedProject?.reaction?.id,
      REACTION_SEED_DATA.FIRST_LIKED_PROJECT_UPDATE_REACTION.id,
    );
    assert.isNull(noLikedProject?.reaction);
  });
}

function projectBySlugTestCases() {
  it('should return projects with indicated slug', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectsBySlugQuery,
      variables: {
        slug: project1.slug,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), project1.id);
  });
  it('should not return drafted if not logged in', async () => {
    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectsBySlugQuery,
      variables: {
        slug: draftedProject.slug,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should not return drafted project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectsBySlugQuery,
        variables: {
          slug: draftedProject.slug,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return drafted if logged in', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectsBySlugQuery,
        variables: {
          slug: draftedProject.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), draftedProject.id);
  });

  it('should not return cancelled if not logged in', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectsBySlugQuery,
      variables: {
        slug: project.slug,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should not return cancelled project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectsBySlugQuery,
        variables: {
          slug: project.slug,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return cancelled if logged in', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectsBySlugQuery,
        variables: {
          slug: cancelledProject.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), cancelledProject.id);
  });
}

function similarProjectsBySlugTestCases() {
  it('should return related projects with the exact same categories', async () => {
    const viewedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food2', 'food3'],
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food2', 'food3'],
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchSimilarProjectsBySlugQuery,
      variables: {
        slug: viewedProject.slug,
      },
    });

    const projects = result.data.data.similarProjectsBySlug.projects;
    const totalCount = result.data.data.similarProjectsBySlug.totalCount;

    // excludes viewed project
    assert.equal(totalCount, 1);
    assert.equal(projects[0].id, secondProject.id);
  });
  it('should return projects with at least one matching category, if not all matched', async () => {
    const viewedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food4', 'food8'],
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food5', 'food8'],
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchSimilarProjectsBySlugQuery,
      variables: {
        slug: viewedProject.slug,
        take: 3,
        skip: 0,
      },
    });

    const c = await Category.findOne({ name: 'food8' });
    const [_, relatedCount] = await Project.createQueryBuilder('project')
      .innerJoinAndSelect('project.categories', 'categories')
      .where('categories.id IN (:...ids)', { ids: [c?.id] })
      .andWhere('project.id != :id', { id: viewedProject.id })
      .take(1)
      .skip(0)
      .getManyAndCount();

    const projects = result.data.data.similarProjectsBySlug.projects;
    const totalCount = result.data.data.similarProjectsBySlug.totalCount;

    // matched food 8 category and returns related projects
    assert.equal(projects[0].id, secondProject.id);
    assert.equal(totalCount, relatedCount);
    assert.equal(totalCount, 1);
  });
  it('should return projects with the same admin, if no category matches', async () => {
    const viewedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food6'],
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchSimilarProjectsBySlugQuery,
      variables: {
        slug: viewedProject.slug,
      },
    });

    const projects = result.data.data.similarProjectsBySlug.projects;
    const totalCount = result.data.data.similarProjectsBySlug.totalCount;

    const [_, relatedCount] = await Project.createQueryBuilder('project')
      .innerJoinAndSelect('project.categories', 'categories')
      .where('project.id != :id', { id: viewedProject?.id })
      .andWhere('project.admin = :ownerId', {
        ownerId: String(SEED_DATA.FIRST_USER.id),
      })
      .andWhere(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
      )
      .take(1)
      .skip(0)
      .getManyAndCount();

    // since no project matched the food6 category it will return all admin projects
    // all projects belong to admin '1' by default
    assert.equal(totalCount, relatedCount);

    // viewed project should not be present in the result set
    const currentViewedProject = projects.find(
      project => project.id === viewedProject.id,
    );
    assert.isUndefined(currentViewedProject);
  });
}

function addProjectUpdateTestCases() {
  it('should add project update successfuly ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testProjectUpdateFateme',
    }).save();
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(user.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(user.id);

    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject, title: String(new Date().getTime()) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const result = await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: Number(addProjectResponse.data.data.createProject.id),
          content: 'TestProjectUpdateFateme',
          title: 'testProjectUpdateFateme',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.data.addProjectUpdate.title,
      'testProjectUpdateFateme',
    );
  });
  it('should can not add project update because of ownerShip ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testProjectUpdateFateme',
    }).save();

    const user1 = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testProjectUpdateFateme1',
    }).save();

    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(user.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(user.id);
    const accessTokenUser1 = await generateTestAccessToken(user1.id);

    // Add project that user is its admin
    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject, title: String(new Date().getTime()) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    // Add projectUpdate with accessToken user1
    const result = await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: Number(addProjectResponse.data.data.createProject.id),
          content: 'TestProjectUpdateFateme',
          title: 'testProjectUpdateFateme',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokenUser1}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('should can not add project update because of not found project ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testProjectUpdateFateme',
    }).save();

    const accessToken = await generateTestAccessToken(user.id);
    const projectUpdateCount = await ProjectUpdate.count();

    const result = await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: Number(projectUpdateCount + 1),
          content: 'TestProjectUpdateFateme2',
          title: 'testProjectUpdateFateme2',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
  it('should can not add project update because of lack of authentication ', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: addProjectUpdateQuery,
      variables: {
        projectId: Number(project.id),
        content: 'TestProjectUpdateFateme2',
        title: 'testProjectUpdateFateme2',
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('should can not add project update because user not found ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testEditProjectUpdateFateme',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    await User.delete({ id: user.id });
    const projectCount = await Project.count();
    const result = await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: Number(projectCount || 1),
          content: 'TestProjectUpdateFateme4',
          title: 'testAddProjectUpdateFateme4',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, errorMessages.USER_NOT_FOUND);
  });
}

function editProjectUpdateTestCases() {
  it('should edit project update successfully ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testEditProjectUpdateFateme',
    }).save();
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(user.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(user.id);

    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject, title: String(new Date().getTime()) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const updateProject = await ProjectUpdate.create({
      userId: user.id,
      projectId: Number(addProjectResponse.data.data.createProject.id),
      content: 'TestProjectUpdateFateme',
      title: 'testEditProjectUpdateFateme',
      createdAt: new Date(),
      isMain: false,
    }).save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: editProjectUpdateQuery,
        variables: {
          updateId: updateProject.id,
          content: 'TestProjectUpdateAfterUpdateFateme',
          title: 'testEditProjectUpdateAfterUpdateFateme',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.editProjectUpdate.title,
      'testEditProjectUpdateAfterUpdateFateme',
    );
  });
  it('should can not edit project update because of ownerShip ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testEditProjectUpdateFateme',
    }).save();

    const user1 = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testEditProjectUpdateFateme1',
    }).save();

    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(user.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(user.id);
    const accessTokenUser1 = await generateTestAccessToken(user1.id);

    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject, title: String(new Date().getTime()) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const updateProject = await ProjectUpdate.create({
      userId: user.id,
      projectId: Number(addProjectResponse.data.data.createProject.id),
      content: 'TestProjectUpdateFateme',
      title: 'testEditProjectUpdateFateme',
      createdAt: new Date(),
      isMain: false,
    }).save();
    // Add projectUpdate with accessToken user1
    const result = await axios.post(
      graphqlUrl,
      {
        query: editProjectUpdateQuery,
        variables: {
          updateId: Number(updateProject.id),
          content: 'TestProjectUpdateAfterUpdateFateme',
          title: 'testEditProjectAfterUpdateFateme',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokenUser1}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('should can not edit project update because of not found project ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testEditProjectUpdateFateme',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const projectUpdateCount = await ProjectUpdate.count();
    const result = await axios.post(
      graphqlUrl,
      {
        query: editProjectUpdateQuery,
        variables: {
          updateId: Number(projectUpdateCount + 1),
          content: 'TestProjectUpdateFateme2',
          title: 'testEditProjectUpdateFateme2',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, 'Project Update not found.');
  });
  it('should can not edit project update because of lack of authentication ', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: editProjectUpdateQuery,
      variables: {
        updateId: Number(project.id),
        content: 'TestProjectAfterUpdateFateme2',
        title: 'testEditProjectAfterUpdateFateme2',
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
}

function deleteProjectUpdateTestCases() {
  it('should delete project update successfully ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testDeleteProjectUpdateFateme',
    }).save();
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(user.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(user.id);

    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject, title: String(new Date().getTime()) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const updateProject = await ProjectUpdate.create({
      userId: user.id,
      projectId: Number(addProjectResponse.data.data.createProject.id),
      content: 'TestProjectUpdateFateme',
      title: 'testDeleteProjectUpdateFateme',
      createdAt: new Date(),
      isMain: false,
    }).save();

    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteProjectUpdateQuery,
        variables: {
          updateId: updateProject.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.data.deleteProjectUpdate, true);
  });
  it('should can not delete project update because of ownerShip ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testDeleteProjectUpdateFateme',
    }).save();

    const user1 = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testDeleteProjectUpdateFateme1',
    }).save();

    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(user.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(user.id);
    const accessTokenUser1 = await generateTestAccessToken(user1.id);

    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject, title: String(new Date().getTime()) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const updateProject = await ProjectUpdate.create({
      userId: user.id,
      projectId: Number(addProjectResponse.data.data.createProject.id),
      content: 'TestProjectUpdateFateme',
      title: 'testDeleteProjectUpdateFateme',
      createdAt: new Date(),
      isMain: false,
    }).save();
    // Add projectUpdate with accessToken user1
    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteProjectUpdateQuery,
        variables: {
          updateId: Number(updateProject.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokenUser1}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('should can not delete project update because of not found project ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testDeleteProjectUpdateFateme',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const projectUpdateCount = await ProjectUpdate.count();
    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteProjectUpdateQuery,
        variables: {
          updateId: Number(projectUpdateCount + 2),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, 'Project Update not found.');
  });
  it('should can not delete project update because of lack of authentication ', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: deleteProjectUpdateQuery,
      variables: {
        updateId: Number(project.id),
        content: 'TestProjectAfterUpdateFateme2',
        title: 'testDeleteProjectAfterUpdateFateme2',
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
}
