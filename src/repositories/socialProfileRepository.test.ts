import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  saveProjectDirectlyToDb,
  saveProjectVerificationFormDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  createSocialProfile,
  findSocialProfileById,
  findSocialProfilesByProjectId,
  removeSocialProfileById,
} from './socialProfileRepository';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import { assert } from 'chai';

describe(
  'removeSocialProfileById test cases',
  removeSocialProfileByIdTestCases,
);
describe(
  'findSocialProfilesByProjectId test cases',
  findSocialProfilesByProjectIdTestCases,
);

function removeSocialProfileByIdTestCases() {
  it('should remove social profile successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm =
      await saveProjectVerificationFormDirectlyToDb({
        project,
        user,
      });
    const socialProfile = await createSocialProfile({
      socialNetwork: SOCIAL_NETWORKS.FACEBOOK,
      socialNetworkId: 'username socialNetworkId',
      projectVerificationId: projectVerificationForm.id,
      isVerified: false,
    });
    assert.isOk(socialProfile);
    await removeSocialProfileById({ socialProfileId: socialProfile.id });
    const result = await findSocialProfileById(socialProfile.id);
    assert.isNotOk(result);
  });
}

function findSocialProfilesByProjectIdTestCases() {
  it('should find social profile with projectId', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm =
      await saveProjectVerificationFormDirectlyToDb({
        project,
        user,
      });
    const socialProfile = await createSocialProfile({
      socialNetwork: SOCIAL_NETWORKS.FACEBOOK,
      socialNetworkId: 'username socialNetworkId',
      projectVerificationId: projectVerificationForm.id,
      isVerified: false,
    });
    const socialProfiles = await findSocialProfilesByProjectId({
      projectId: project.id,
    });
    assert.equal(socialProfiles.length, 1);
    assert.equal(socialProfiles[0].id, socialProfile.id);
  });
  it('should return empty list if project doesnt have any connected social profile', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const socialProfiles = await findSocialProfilesByProjectId({
      projectId: project.id,
    });
    assert.equal(socialProfiles.length, 0);
  });
}
