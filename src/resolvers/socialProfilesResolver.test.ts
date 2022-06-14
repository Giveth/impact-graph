import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveProjectVerificationFormDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import axios from 'axios';
import { addNewSocialProfileMutation } from '../../test/graphqlQueries';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import { assert } from 'chai';
import { findProjectVerificationFormById } from '../repositories/projectVerificationRepository';
import { errorMessages } from '../utils/errorMessages';
import { PROJECT_VERIFICATION_STATUSES } from '../entities/projectVerificationForm';
import { createSocialProfile } from '../repositories/socialProfileRepository';

describe(
  'addNewSocialProfile test cases',
  addNewSocialProfileFormMutationTestCases,
);

function addNewSocialProfileFormMutationTestCases() {
  it('should add an unverified social profile', async () => {
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
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: addNewSocialProfileMutation,
        variables: {
          projectVerificationId: projectVerificationForm.id,
          socialNetwork: SOCIAL_NETWORKS.DISCORD,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.addNewSocialProfile);
  });
  it('should add an unverified social profile, if there is a social profile with that id and different social network for this form', async () => {
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
    const accessToken = await generateTestAccessToken(user.id);
    await createSocialProfile({
      socialNetwork: SOCIAL_NETWORKS.FACEBOOK,
      socialNetworkId: 'username socialNetworkId',
      projectVerificationId: projectVerificationForm.id,
      isVerified: false,
    });
    const result = await axios.post(
      graphqlUrl,
      {
        query: addNewSocialProfileMutation,
        variables: {
          projectVerificationId: projectVerificationForm.id,
          socialNetwork: SOCIAL_NETWORKS.DISCORD,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.addNewSocialProfile);
  });
  it('should get error when user is not logged in', async () => {
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
    const result = await axios.post(graphqlUrl, {
      query: addNewSocialProfileMutation,
      variables: {
        projectVerificationId: projectVerificationForm.id,
        socialNetwork: SOCIAL_NETWORKS.DISCORD,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('should get error when project verification form not found', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: addNewSocialProfileMutation,
        variables: {
          projectVerificationId: 999999,
          socialNetwork: SOCIAL_NETWORKS.DISCORD,
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
      errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND,
    );
  });
  it('should get error when user is not owner  project verification form', async () => {
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
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: addNewSocialProfileMutation,
        variables: {
          projectVerificationId: projectVerificationForm.id,
          socialNetwork: SOCIAL_NETWORKS.DISCORD,
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
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM,
    );
  });
  it('should get error when project verification form is verified', async () => {
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
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
    await projectVerificationForm.save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: addNewSocialProfileMutation,
        variables: {
          projectVerificationId: projectVerificationForm.id,
          socialNetwork: SOCIAL_NETWORKS.DISCORD,
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
      errorMessages.PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_ADD_SOCIAL_PROFILE_TO_IT,
    );
  });
  it('should get error when project verification form is rejected', async () => {
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
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.REJECTED;
    await projectVerificationForm.save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: addNewSocialProfileMutation,
        variables: {
          projectVerificationId: projectVerificationForm.id,
          socialNetwork: SOCIAL_NETWORKS.DISCORD,
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
      errorMessages.PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_ADD_SOCIAL_PROFILE_TO_IT,
    );
  });
  it('should get error when project verification form is submitted', async () => {
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
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: addNewSocialProfileMutation,
        variables: {
          projectVerificationId: projectVerificationForm.id,
          socialNetwork: SOCIAL_NETWORKS.DISCORD,
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
      errorMessages.PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_ADD_SOCIAL_PROFILE_TO_IT,
    );
  });
  // it('should get error when social profile is already added for this form', async () => {
  //   const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  //   const project = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     admin: String(user.id),
  //     verified: false,
  //   });
  //   const projectVerificationForm =
  //     await saveProjectVerificationFormDirectlyToDb({
  //       project,
  //       user,
  //     });
  //   const accessToken = await generateTestAccessToken(user.id);
  //   const socialNetwork = 'SOCIAL_NETWORKS.DISCORD';
  //   await createSocialProfile({
  //     socialNetwork,
  //     socialNetworkId,
  //     projectVerificationId: projectVerificationForm.id,
  //     isVerified: false
  //   });
  //
  //   const result = await axios.post(
  //     graphqlUrl,
  //     {
  //       query: addNewSocialProfileMutation,
  //       variables: {
  //         projectVerificationId: projectVerificationForm.id,
  //         socialNetwork,
  //         socialNetworkId,
  //       },
  //     },
  //     {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //     },
  //   );
  //   assert.equal(
  //     result.data.errors[0].message,
  //     errorMessages.YOU_ALREADY_ADDDED_THIS_SOCIAL_PROFILE_FOR_THIS_VERIFICATION_FORM,
  //   );
  // });
  // it('should get error when social profile is already added for this form', async () => {
  //   const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  //   const project = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     admin: String(user.id),
  //     verified: false,
  //   });
  //   const projectVerificationForm =
  //     await saveProjectVerificationFormDirectlyToDb({
  //       project,
  //       user,
  //     });
  //   const accessToken = await generateTestAccessToken(user.id);
  //   const socialNetwork = SOCIAL_NETWORKS.DISCORD;
  //   await createSocialProfile({
  //     socialNetwork,
  //     socialNetworkId,
  //     projectVerificationId: projectVerificationForm.id,
  //     isVerified: false
  //   });
  //   const result = await axios.post(
  //     graphqlUrl,
  //     {
  //       query: addNewSocialProfileMutation,
  //       variables: {
  //         projectVerificationId: projectVerificationForm.id,
  //         socialNetwork,
  //       },
  //     },
  //     {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //     },
  //   );
  //   assert.equal(
  //     result.data.errors[0].message,
  //     errorMessages.YOU_ALREADY_ADDDED_THIS_SOCIAL_PROFILE_FOR_THIS_VERIFICATION_FORM,
  //   );
  // });
}
