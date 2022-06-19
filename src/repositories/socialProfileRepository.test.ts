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
  removeSocialProfileById,
} from './socialProfileRepository';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import { assert } from 'chai';

describe(
  'removeSocialProfileById test cases',
  removeSocialProfileByIdTestCases,
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
