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
} from '../../test/testUtils';
import axios from 'axios';
import {
  activateProjectQuery,
  addProjectQuery,
  deactivateProjectQuery,
  editProjectQuery,
  fetchAllProjectsQuery,
  fetchLikedProjectsQuery,
  fetchProjectUpdatesQuery,
  projectByIdQuery,
} from '../../test/graphqlQueries';
import { ProjectInput } from './types/project-input';
import { errorMessages } from '../utils/errorMessages';
import {
  OrderField,
  Project,
  ProjStatus,
  ProjectUpdate,
} from '../entities/project';
import { Reaction } from '../entities/reaction';
import { ProjectStatus } from '../entities/projectStatus';
import { ProjectStatusHistory } from '../entities/projectStatusHistory';
import { User } from '../entities/user';

describe('addProject test cases --->', addProjectTestCases);
describe('editProject test cases --->', editProjectTestCases);

describe('projects test cases --->', projectsTestCases);
describe('deactivateProject test cases --->', deactivateProjectTestCases);
describe('activateProject test cases --->', activateProjectTestCases);

describe('getProjectUpdates test cases --->', getProjectUpdatesTestCases);
describe(
  'likedProjectsByUserId test cases --->',
  likedProjectsByUserIdTestCases,
);
describe('projectById test cases --->', projectByIdTestCases);

// TODO We should implement test cases for below query/mutation
// describe('topProjects test cases --->', topProjectsTestCases);
// describe('project test cases --->', projectTestCases);
// describe('projectBySlug test cases --->', projectBySlugTestCases);
// describe('uploadImage test cases --->', uploadImageTestCases);
// describe('addProjectUpdate test cases --->', addProjectUpdateTestCases);
// describe('editProjectUpdate test cases --->', editProjectUpdateTestCases);
// describe('deleteProjectUpdate test cases --->', deleteProjectUpdateTestCases);
// describe('getProjectsRecipients test cases --->', getProjectsRecipientsTestCases);
// describe('getProjectReactions test cases --->', getProjectReactionsTestCases);
// describe('walletAddressIsValid test cases --->', walletAddressIsValidTestCases);
// describe('isValidTitleForProject test cases --->', isValidTitleForProjectTestCases);
// describe('projectByAddress test cases --->', projectByAddressTestCases);
// describe('projectsByUserId test cases --->', projectsByUserIdTestCases);

// We may can delete this query
// describe('updateProjectStatus test cases --->', updateProjectStatusTestCases);

// describe('activateProject test cases --->', activateProjectTestCases);

function projectsTestCases() {
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
      new Date(result.data.data.projects.projects[0].updatedAt) <
        new Date(
          result.data.data.projects.projects[projectsCount - 1].updatedAt,
        ),
    );
    assert.isTrue(
      new Date(
        result.data.data.projects.projects[projectsCount - 2].updatedAt,
      ) <
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
    assert.isTrue(result.data.data.projects.projects[0].verified);
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
    assert.isNotTrue(result.data.data.projects.projects[0].verified);
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
    assert.exists(result.data.data.projects.projects[0].traceCampaignId);
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
    assert.notExists(result.data.data.projects.projects[0].traceCampaignId);
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
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'Donations',
          direction: 'ASC',
        },
      },
    });
    assert.equal(result.data.data.projects.projects[0].totalDonations, 10);
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

function addProjectTestCases() {
  it('Create Project should return <<Access denied>>, calling without token', async () => {
    const sampleProject = {
      title: 'title1',
    };
    const result = await axios.post(graphqlUrl, {
      query: addProjectQuery,
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
        query: addProjectQuery,
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
    const sampleProject: ProjectInput = {
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
        query: addProjectQuery,
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
    const sampleProject: ProjectInput = {
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
        query: addProjectQuery,
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
    const sampleProject: ProjectInput = {
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
        query: addProjectQuery,
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
    const sampleProject: ProjectInput = {
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
        query: addProjectQuery,
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
    const sampleProject: ProjectInput = {
      title: 'title1',
      categories: [SEED_DATA.CATEGORIES[0]],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
      walletAddress: generateRandomEtheriumAddress(),
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: addProjectQuery,
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
    assert.exists(result.data.data.addProject);
    assert.equal(result.data.data.addProject.title, sampleProject.title);

    // When creating project, listed is null by default
    assert.equal(result.data.data.addProject.listed, null);

    assert.equal(
      result.data.data.addProject.admin,
      String(SEED_DATA.FIRST_USER.id),
    );
    assert.equal(result.data.data.addProject.verified, false);
    assert.equal(
      result.data.data.addProject.status.id,
      String(ProjStatus.active),
    );
    assert.equal(
      result.data.data.addProject.description,
      sampleProject.description,
    );
    assert.equal(
      result.data.data.addProject.walletAddress,
      sampleProject.walletAddress,
    );
  });
}

function editProjectTestCases() {
  it('Edit Project should return <<Access denied>>, calling without token', async () => {
    const sampleProject = {
      title: 'title1',
    };
    const result = await axios.post(graphqlUrl, {
      query: editProjectQuery,
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
  it('Should get error when editing someone else project', async () => {
    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: editProjectQuery,
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
        query: editProjectQuery,
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
        query: editProjectQuery,
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
        query: editProjectQuery,
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
        query: editProjectQuery,
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
        query: editProjectQuery,
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
        query: addProjectQuery,
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
        query: editProjectQuery,
        variables: {
          projectId: Number(createProjectResult.data.data.addProject.id),
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
    assert.equal(editProjectResult.data.data.editProject.title, newTitle);
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
        query: addProjectQuery,
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
    const newTitle = `test 1234567`;
    const newSlug = `test-1234567`;
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: editProjectQuery,
        variables: {
          projectId: Number(createProjectResult.data.data.addProject.id),
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
    assert.equal(editProjectResult.data.data.editProject.title, newTitle);
    assert.equal(editProjectResult.data.data.editProject.slug, newSlug);
    assert.isTrue(
      editProjectResult.data.data.editProject.slugHistory.includes(slug),
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
        query: addProjectQuery,
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
        query: editProjectQuery,
        variables: {
          projectId: Number(createProjectResult.data.data.addProject.id),
          newProjectData: {
            title: String(new Date().getTime()),
            walletAddress:
              createProjectResult.data.data.addProject.walletAddress,
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
      editProjectResult.data.data.editProject.walletAddress,
      createProjectResult.data.data.addProject.walletAddress,
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
        query: editProjectQuery,
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
    assert.isTrue(editProjectResult.data.data.editProject.verified);
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
        query: editProjectQuery,
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
    assert.isFalse(editProjectResult.data.data.editProject.verified);
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
        query: editProjectQuery,
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
    assert.equal(editProjectResult.data.data.editProject.listed, null);
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
        query: editProjectQuery,
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
    assert.equal(editProjectResult.data.data.editProject.listed, null);
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
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactiveStatus = await ProjectStatus.findOne({
      id: ProjStatus.deactive,
    });
    project.status = deactiveStatus as ProjectStatus;
    await project.save();
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
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactiveStatus = await ProjectStatus.findOne({
      id: ProjStatus.deactive,
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
      listed: true,
    });
    const deactiveStatus = await ProjectStatus.findOne({
      id: ProjStatus.deactive,
    });
    project.status = deactiveStatus as ProjectStatus;
    await project.save();
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
    });
    const deactiveStatus = await ProjectStatus.findOne({
      id: ProjStatus.deactive,
    });
    project.status = deactiveStatus as ProjectStatus;
    await project.save();
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

  it('should return project null with invalid id', async () => {
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        // To make use id is invalid
        id: 9999999,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      'Cannot return null for non-nullable field Query.projectById.',
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
