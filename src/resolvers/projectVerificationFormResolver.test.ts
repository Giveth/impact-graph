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
import { createProjectVerificationFormMutation } from '../../test/graphqlQueries';
import { ProjStatus } from '../entities/project';
import { PROJECT_VERIFICATION_STATUSES } from '../entities/projectVerificationForm';

describe(
  'createProjectVerificatio test cases',
  createProjectVerificationFormMutationTestCases,
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
          projectId: Number(project.id),
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
