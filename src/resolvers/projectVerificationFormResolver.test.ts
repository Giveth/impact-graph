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
} from '../../test/graphqlQueries';
import { ProjStatus } from '../entities/project';
import { PROJECT_VERIFICATION_STATUSES } from '../entities/projectVerificationForm';
import { createProjectVerificationForm } from '../repositories/projectVerificationRepository';

describe(
  'createProjectVerification test cases',
  createProjectVerificationFormMutationTestCases,
);
describe(
  'getCurrentProjectVerificationForm test cases',
  getCurrentProjectVerificationFormTestCases,
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
