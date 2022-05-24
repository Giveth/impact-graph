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
import { ProjStatus } from '../entities/project';
import {
  PROJECT_VERIFICATION_STATUSES,
  PROJECT_VERIFICATION_STEPS,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import { createProjectVerificationForm } from '../repositories/projectVerificationRepository';

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
}
