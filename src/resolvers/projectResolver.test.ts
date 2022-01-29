import { assert, expect } from 'chai';
import 'mocha';
import { createServerWithDummyUser } from '../server/testServerFactory';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import axios from 'axios';
import {
  addProjectQuery,
  editProjectQuery,
  fetchAllProjectsQuery,
} from '../../test/graphqlQueries';
import { ProjectInput } from './types/project-input';
import { errorMessages } from '../utils/errorMessages';
import { OrderField, Project, ProjStatus } from '../entities/project';

let apolloServer;

describe('addProject test cases --->', addProjectTestCases);
describe('editProject test cases --->', editProjectTestCases);

describe('projects test cases --->', projectsTestCases);

// TODO We should implement test cases for below query/mutation
// describe('topProjects test cases --->', topProjectsTestCases);
// describe('project test cases --->', projectTestCases);
// describe('projectById test cases --->', projectByIdTestCases);
// describe('projectBySlug test cases --->', projectBySlugTestCases);
// describe('uploadImage test cases --->', uploadImageTestCases);
// describe('addProjectUpdate test cases --->', addProjectUpdateTestCases);
// describe('editProjectUpdate test cases --->', editProjectUpdateTestCases);
// describe('deleteProjectUpdate test cases --->', deleteProjectUpdateTestCases);
// describe('toggleReaction test cases --->', toggleReactionTestCases);
// describe('toggleProjectReaction test cases --->', toggleProjectReactionTestCases);
// describe('getProjectUpdates test cases --->', getProjectUpdatesTestCases);
// describe('getProjectsRecipients test cases --->', getProjectsRecipientsTestCases);
// describe('getProjectReactions test cases --->', getProjectReactionsTestCases);
// describe('walletAddressIsValid test cases --->', walletAddressIsValidTestCases);
// describe('isValidTitleForProject test cases --->', isValidTitleForProjectTestCases);
// describe('projectByAddress test cases --->', projectByAddressTestCases);
// describe('projectsByUserId test cases --->', projectsByUserIdTestCases);

// We may can delete this query
// describe('updateProjectStatus test cases --->', updateProjectStatusTestCases);

// describe('deactivateProject test cases --->', deactivateProjectTestCases);
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
    assert.equal(result.data.data.projects.projects.length, take);
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
    firstProject.title = 'Changin title to just update updateAt';
    await firstProject.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchAllProjectsQuery,
      variables: {
        orderBy: {
          field: 'UpdatedAt',
          direction: 'DESC',
        },
      },
    });
    assert.equal(
      Number(result.data.data.projects.projects[0].id),
      firstProject.id,
    );
    assert.equal(
      Number(result.data.data.projects.projects[1].id),
      secondProject.id,
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
    assert.equal(result.data.errors[0].message, errorMessages.ACCESS_DENIED);
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
          projectId: 1000_000,

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
}

before(async () => {
  apolloServer = await createServerWithDummyUser();
});
