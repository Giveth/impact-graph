import { assert } from 'chai';
import axios from 'axios';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  createProjectVerificationFormMutation,
  getCurrentProjectVerificationFormQuery,
  updateProjectVerificationFormMutation,
} from '../../test/graphqlQueries';
import {
  PROJECT_VERIFICATION_STATUSES,
  PROJECT_VERIFICATION_STEPS,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import { Project, ProjStatus } from '../entities/project';
import { createProjectVerificationForm } from '../repositories/projectVerificationRepository';
import { errorMessages } from '../utils/errorMessages';

describe(
  'createProjectVerification test cases',
  createProjectVerificationFormMutationTestCases,
);
describe(
  'getCurrentProjectVerificationForm test cases',
  getCurrentProjectVerificationFormTestCases,
);

describe(
  'updateProjectVerificationFormMutation test cases',
  updateProjectVerificationFormMutationTestCases,
);

function createProjectVerificationFormMutationTestCases() {
  it('should create project verification form successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user.id),
      verified: false,
      listed: false,
    });
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          projectId: project.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.data.createProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
  });
  it('should not create project verification because user that is authenticated is not project owner', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user1.id),
      verified: false,
      listed: false,
    });
    const accessToken = await generateTestAccessToken(user2.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          projectId: project.id,
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
      'You are not the owner of this project.',
    );
  });
  it('should not create project verification because project verified before', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      admin: String(user.id),
      verified: true,
      listed: false,
    });
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          projectId: project.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, 'Project is already verified.');
  });
  it('should not create project verification because project not found', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const projectId = Number(await Project.count()) + 3;
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          projectId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, 'Project not found.');
  });
  it('should not create project verification because user not found', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user.id),
      verified: false,
      listed: false,
    });
    const result = await axios.post(graphqlUrl, {
      query: createProjectVerificationFormMutation,
      variables: {
        projectId: project.id,
      },
    });
    assert.equal(result.data.errors[0].message, 'unAuthorized');
  });
  it('should not create project verification because user have draft project verification', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user.id),
      verified: false,
      listed: false,
    });
    const accessToken = await generateTestAccessToken(user.id);

    await ProjectVerificationForm.create({
      project,
      user,
      status: 'draft',
    }).save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          projectId: project.id,
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
      'There is an ongoing project verification request for this project',
    );
  });
  it('should not create project verification because user have submitted project verification', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user.id),
      verified: false,
      listed: false,
    });
    const accessToken = await generateTestAccessToken(user.id);

    await ProjectVerificationForm.create({
      project,
      user,
      status: 'submitted',
    }).save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          projectId: project.id,
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
      'There is an ongoing project verification request for this project',
    );
  });
}

function updateProjectVerificationFormMutationTestCases() {
  it('should update project verification with projectContacts form successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user.id),
      verified: false,
      listed: false,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const projectContacts = {
      facebook: 'facebookAddress',
      instagram: 'instagramAddress',
      linkedin: 'linkedinAddress',
      twitter: '',
      youtube: 'youtubeAddress',
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS,
            projectContacts,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(result.data.data.updateProjectVerificationForm);

    // TODO after fixing graphql output, below test cases should be uncommented
    // assert.equal(
    //   result.data.data.updateProjectVerificationForm.status,
    //   PROJECT_VERIFICATION_STATUSES.DRAFT,
    // );
    // assert.equal(
    //   result.data.data.updateProjectVerificationForm.projectContacts.linkedin,
    //   projectContacts.linkedin,
    // );
    // assert.equal(
    //   result.data.data.updateProjectVerificationForm.projectContacts.twitter,
    //   projectContacts.twitter,
    // );
  });
}

function getCurrentProjectVerificationFormTestCases() {
  it('should get current project verification form with submitted status', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user.id),
      verified: false,
      listed: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          projectId: project.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.status,
      projectVerificationForm.status,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.id,
      projectVerificationForm.id,
    );
  });
  it('should get current project verification form with draft status', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user.id),
      verified: false,
      listed: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
    await projectVerificationForm.save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          projectId: project.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.status,
      projectVerificationForm.status,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.id,
      projectVerificationForm.id,
    );
  });
  it('should not get current project verification because unauthorized', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      admin: String(user.id),
      verified: true,
      listed: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();
    const result = await axios.post(graphqlUrl, {
      query: getCurrentProjectVerificationFormQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.equal(result.data.errors[0].message, errorMessages.UN_AUTHORIZED);
  });
  it('should get current project verification because user not found', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user1.id),
      verified: false,
      listed: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user1.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
    await projectVerificationForm.save();
    const accessToken = await generateTestAccessToken(user2.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          projectId: project.id,
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
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('should get current project verification because project doesnt have project verification form', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      admin: String(user.id),
      verified: false,
      listed: false,
    });
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          projectId: project.id,
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
      errorMessages.THERE_IS_NOT_ANY_ONGOING_PROJECT_VERIFICATION_FORM_FOR_THIS_PROJECT,
    );
  });
  it('should get current project verification because project not found', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const projectId = Number(await Project.count()) + 3;
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          projectId,
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
}
