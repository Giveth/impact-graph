import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
} from '../../test/testUtils';
import axios from 'axios';
import { boostSingleProjectMutation } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { errorMessages } from '../utils/errorMessages';
import { PowerBoosting } from '../entities/powerBoosting';

// Clean percentages after setting
export const removePowerBoostings = async (ids: number[]): Promise<void> => {
  await PowerBoosting.delete(ids);
};

describe(
  'setGivPowerBoostingMutation test cases',
  setGivPowerBoostingTestCases,
);
function setGivPowerBoostingTestCases() {
  it('should get error when the user is not authenticated', async () => {
    const result = await axios.post(graphqlUrl, {
      query: boostSingleProjectMutation,
      variables: {
        projectId: SEED_DATA.FIRST_PROJECT.id,
        percentage: 100,
      },
    });

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('should get error when the user wants to boost a project with invalid percentage value', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: boostSingleProjectMutation,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          percentage: 101,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_PERCENTAGE_INVALID_RANGE,
    );
  });

  it('should get error when the user boosts for the first time with a value other than 100%', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: boostSingleProjectMutation,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          percentage: 90,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT,
    );
  });

  it('should set single project boost percentage 100%', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: boostSingleProjectMutation,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          percentage: 100,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(result);
    const powerBoostings: PowerBoosting[] =
      result.data.data.setSinglePowerBoosting;
    assert.isArray(powerBoostings);
    assert.lengthOf(powerBoostings, 1);
    assert.equal(powerBoostings[0].percentage, 100);

    // Clean
    await removePowerBoostings(powerBoostings.map(({ id }) => id));
  });

  it('should adjust older boosting by setting a single boosting', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    let result = await axios.post(
      graphqlUrl,
      {
        query: boostSingleProjectMutation,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          percentage: 100,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    let powerBoostings: PowerBoosting[] =
      result.data.data.setSinglePowerBoosting;

    // Boost the second project 20 percent
    result = await axios.post(
      graphqlUrl,
      {
        query: boostSingleProjectMutation,
        variables: {
          projectId: SEED_DATA.SECOND_PROJECT.id,
          percentage: 20,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    powerBoostings = result.data.data.setSinglePowerBoosting;

    assert.lengthOf(powerBoostings, 2);

    let firstProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.FIRST_PROJECT.id,
    ) as PowerBoosting;
    let secondProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.SECOND_PROJECT.id,
    ) as PowerBoosting;

    assert.isDefined(firstProjectBoost);
    assert.isDefined(secondProjectBoost);

    assert.equal(firstProjectBoost.percentage, 80);
    assert.equal(secondProjectBoost.percentage, 20);

    // Third project 40 percent
    result = await axios.post(
      graphqlUrl,
      {
        query: boostSingleProjectMutation,
        variables: {
          projectId: SEED_DATA.TRANSAK_PROJECT.id,
          percentage: 40,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    powerBoostings = result.data.data.setSinglePowerBoosting;

    assert.lengthOf(powerBoostings, 3);

    firstProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.FIRST_PROJECT.id,
    ) as PowerBoosting;
    secondProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.SECOND_PROJECT.id,
    ) as PowerBoosting;
    const thirdProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.TRANSAK_PROJECT.id,
    ) as PowerBoosting;

    assert.isDefined(firstProjectBoost);
    assert.isDefined(secondProjectBoost);
    assert.isDefined(thirdProjectBoost);

    assert.equal(firstProjectBoost.percentage, 48);
    assert.equal(secondProjectBoost.percentage, 12);
    assert.equal(thirdProjectBoost.percentage, 40);

    // Clean
    await removePowerBoostings(powerBoostings.map(({ id }) => id));
  });

  it('should remove older boosting by setting a single 100% boosting', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    await axios.post(
      graphqlUrl,
      {
        query: boostSingleProjectMutation,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          percentage: 100,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    await axios.post(
      graphqlUrl,
      {
        query: boostSingleProjectMutation,
        variables: {
          projectId: SEED_DATA.SECOND_PROJECT.id,
          percentage: 20,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    // Third project 40 percent
    const result = await axios.post(
      graphqlUrl,
      {
        query: boostSingleProjectMutation,
        variables: {
          projectId: SEED_DATA.TRANSAK_PROJECT.id,
          percentage: 100,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const powerBoostings = result.data.data.setSinglePowerBoosting;

    assert.lengthOf(powerBoostings, 1);

    const thirdProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.TRANSAK_PROJECT.id,
    ) as PowerBoosting;

    assert.isDefined(thirdProjectBoost);

    assert.equal(thirdProjectBoost.percentage, 100);

    // Clean
    await removePowerBoostings(powerBoostings.map(({ id }) => id));
  });
}
