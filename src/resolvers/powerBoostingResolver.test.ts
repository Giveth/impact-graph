import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
} from '../../test/testUtils';
import axios, { AxiosResponse } from 'axios';
import { boostSingleProjectMutation } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { errorMessages } from '../utils/errorMessages';
import { PowerBoosting } from '../entities/powerBoosting';

// Clean percentages after setting
const removePowerBoostings = async (boosts: PowerBoosting[]): Promise<void> => {
  await PowerBoosting.delete(boosts.map(b => b.id));
};

const sendSingleBoostQuery = async (
  userId: number,
  projectId: number,
  percentage: number,
): Promise<AxiosResponse> => {
  const accessToken = await generateTestAccessToken(userId);
  return axios.post(
    graphqlUrl,
    {
      query: boostSingleProjectMutation,
      variables: {
        projectId,
        percentage,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
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
    const result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      101,
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_PERCENTAGE_INVALID_RANGE,
    );
  });

  it('should get error when the user boosts for the first time with a value other than 100%', async () => {
    const result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      90,
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT,
    );
  });

  it('should get error when the user with single boosted project boosts it with a value other than 100%', async () => {
    let result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      100,
    );
    assert.isOk(result);
    const powerBoostings: PowerBoosting[] =
      result.data.data.setSinglePowerBoosting;

    result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      90,
    );

    assert.isOk(result);

    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT,
    );

    // clean
    await removePowerBoostings(powerBoostings);
  });

  it('should set single project boost percentage 100%', async () => {
    const result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      100,
    );

    assert.isOk(result);
    const powerBoostings: PowerBoosting[] =
      result.data.data.setSinglePowerBoosting;
    assert.isArray(powerBoostings);
    assert.lengthOf(powerBoostings, 1);
    assert.equal(powerBoostings[0].percentage, 100);

    // Clean
    await removePowerBoostings(powerBoostings);
  });

  it('should adjust older boosting by setting a single boosting', async () => {
    let result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      100,
    );

    let powerBoostings: PowerBoosting[] =
      result.data.data.setSinglePowerBoosting;

    // Boost the second project 20 percent
    result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.SECOND_PROJECT.id,
      20,
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
    result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.TRANSAK_PROJECT.id,
      40,
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
    await removePowerBoostings(powerBoostings);
  });

  it('should remove older boosting by setting a single 100% boosting', async () => {
    await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      100,
    );

    await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.SECOND_PROJECT.id,
      20,
    );

    // Third project 40 percent
    const result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.TRANSAK_PROJECT.id,
      100,
    );

    const powerBoostings = result.data.data.setSinglePowerBoosting;

    assert.lengthOf(powerBoostings, 1);

    const thirdProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.TRANSAK_PROJECT.id,
    ) as PowerBoosting;

    assert.isDefined(thirdProjectBoost);

    assert.equal(thirdProjectBoost.percentage, 100);

    // Clean
    await removePowerBoostings(powerBoostings);
  });

  it('should update boosting by setting a single boosting', async () => {
    await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      100,
    );

    await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.SECOND_PROJECT.id,
      20,
    );

    const result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      40,
    );

    const powerBoostings = result.data.data.setSinglePowerBoosting;

    assert.lengthOf(powerBoostings, 2);

    const firstProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.FIRST_PROJECT.id,
    ) as PowerBoosting;
    const secondProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.SECOND_PROJECT.id,
    ) as PowerBoosting;

    assert.isDefined(firstProjectBoost);
    assert.isDefined(secondProjectBoost);

    assert.equal(firstProjectBoost.percentage, 40);
    assert.equal(secondProjectBoost.percentage, 60);

    // Clean
    await removePowerBoostings(powerBoostings);
  });
}
