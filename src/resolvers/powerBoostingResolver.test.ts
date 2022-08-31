import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
} from '../../test/testUtils';
import axios, { AxiosResponse } from 'axios';
import {
  setMultiplePowerBoostingMutation,
  setSinglePowerBoostingMutation,
} from '../../test/graphqlQueries';
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
      query: setSinglePowerBoostingMutation,
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

const sendMultipleBoostQuery = async (
  userId: number,
  projectIds: number[],
  percentages: number[],
): Promise<AxiosResponse> => {
  const accessToken = await generateTestAccessToken(userId);
  return axios.post(
    graphqlUrl,
    {
      query: setMultiplePowerBoostingMutation,
      variables: {
        projectIds,
        percentages,
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
  'setSinglePowerBoostingMutation test cases',
  setSinglePowerBoostingTestCases,
);

describe(
  'setMultiplePowerBoostingMutation test cases',
  setMultiplePowerBoostingTestCases,
);

function setSinglePowerBoostingTestCases() {
  it('should get error when the user is not authenticated', async () => {
    const result = await axios.post(graphqlUrl, {
      query: setSinglePowerBoostingMutation,
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
    let result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      101,
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );

    result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      -1,
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
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

  // GIVPOWER_BOOSTING_USER_PROJECTS_LIMIT=5
  it('should get error when number of boosted projects will be more than limit', async () => {
    await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
      100,
    );
    await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.SECOND_PROJECT.id,
      10,
    );
    await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.TRANSAK_PROJECT.id,
      10,
    );
    await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FOURTH_PROJECT.id,
      10,
    );
    let result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIFTH_PROJECT.id,
      10,
    );

    assert.isOk(result);
    let powerBoostings = result?.data?.data?.setSinglePowerBoosting;
    assert.lengthOf(powerBoostings, 5);

    ///  Must exceed limit
    result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.SIXTH_PROJECT.id,
      10,
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_MAX_PROJECT_LIMIT,
    );

    /// Zero one of previous boostings
    result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIFTH_PROJECT.id,
      0,
    );
    assert.isOk(result);
    powerBoostings = result?.data?.data?.setSinglePowerBoosting;
    assert.lengthOf(powerBoostings, 4);

    /// Must be able to boost the sixth project now!
    result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.SIXTH_PROJECT.id,
      30,
    );
    assert.isOk(result);
    powerBoostings = result?.data?.data?.setSinglePowerBoosting;
    assert.lengthOf(powerBoostings, 5);

    // Set fifth project 100%

    result = await sendSingleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIFTH_PROJECT.id,
      100,
    );
    assert.isOk(result);
    powerBoostings = result?.data?.data?.setSinglePowerBoosting;
    assert.lengthOf(powerBoostings, 1);

    await removePowerBoostings(powerBoostings);
  });
}

function setMultiplePowerBoostingTestCases() {
  it('should get error when the user is not authenticated', async () => {
    const result = await axios.post(graphqlUrl, {
      query: setMultiplePowerBoostingMutation,
      variables: {
        projectIds: [SEED_DATA.FIRST_PROJECT.id],
        percentages: [100],
      },
    });

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });

  it('should get error when the user wants to boost a project with invalid percentage value', async () => {
    let result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [SEED_DATA.FIRST_PROJECT.id, SEED_DATA.SECOND_PROJECT.id],
      [101, 3],
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );

    result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [SEED_DATA.FIRST_PROJECT.id, SEED_DATA.SECOND_PROJECT.id],
      [20, -1],
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );
  });

  it('should get error when the user wants to boost with invalid arrays of projectIds and percentages', async () => {
    // Empty projectIds and percentages arrays
    let result = await sendMultipleBoostQuery(SEED_DATA.FIRST_USER.id, [], []);

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );

    // Longer projectIds array
    result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [SEED_DATA.FIRST_PROJECT.id, SEED_DATA.SECOND_PROJECT.id],
      [100],
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );

    // Longer percentages array
    result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [SEED_DATA.FIRST_PROJECT.id, SEED_DATA.SECOND_PROJECT.id],
      [20, 30, 50],
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );

    // Repeat a project
    result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [
        SEED_DATA.FIRST_PROJECT.id,
        SEED_DATA.SECOND_PROJECT.id,
        SEED_DATA.FIRST_PROJECT.id,
      ],
      [20, 30, 50],
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );

    // Invalid sum #1
    result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [
        SEED_DATA.FIRST_PROJECT.id,
        SEED_DATA.SECOND_PROJECT.id,
        SEED_DATA.TRANSAK_PROJECT.id,
      ],
      [20, 30, 49], // Less than 100 - (0.01 * number of projects)
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );
    // Invalid sum #2
    result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [
        SEED_DATA.FIRST_PROJECT.id,
        SEED_DATA.SECOND_PROJECT.id,
        SEED_DATA.TRANSAK_PROJECT.id,
      ],
      [20, 33, 49], // More than 100 - (0.01 * number of projects)
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );

    // Invalid #3 - set less than 100 - (0.01 * number of projects)
    result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [
        SEED_DATA.FIRST_PROJECT.id,
        SEED_DATA.SECOND_PROJECT.id,
        SEED_DATA.TRANSAK_PROJECT.id,
      ],
      [5, 12, 82.96],
    );

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
    );
  });

  it('should set multiple power boosting with correct data', async () => {
    let result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [
        SEED_DATA.FIRST_PROJECT.id,
        SEED_DATA.SECOND_PROJECT.id,
        SEED_DATA.TRANSAK_PROJECT.id,
      ],
      [20, 33, 47],
    );

    assert.isOk(result);
    let powerBoostings = result.data.data.setMultiplePowerBoosting;

    assert.lengthOf(powerBoostings, 3);

    const firstProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.FIRST_PROJECT.id,
    ) as PowerBoosting;
    const secondProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.SECOND_PROJECT.id,
    ) as PowerBoosting;
    const thirdProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.TRANSAK_PROJECT.id,
    ) as PowerBoosting;

    assert.isDefined(firstProjectBoost);
    assert.isDefined(secondProjectBoost);
    assert.isDefined(thirdProjectBoost);

    assert.equal(firstProjectBoost.percentage, 20);
    assert.equal(secondProjectBoost.percentage, 33);
    assert.equal(thirdProjectBoost.percentage, 47);

    result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [
        SEED_DATA.FOURTH_PROJECT.id,
        SEED_DATA.FIFTH_PROJECT.id,
        SEED_DATA.SIXTH_PROJECT.id,
      ],
      [19.99, 49.99, 29.99],
    );

    assert.isOk(result);
    powerBoostings = result.data.data.setMultiplePowerBoosting;

    assert.lengthOf(powerBoostings, 3);

    const fourthProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.FOURTH_PROJECT.id,
    ) as PowerBoosting;
    const fifthProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.FIFTH_PROJECT.id,
    ) as PowerBoosting;
    const sixthProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.SIXTH_PROJECT.id,
    ) as PowerBoosting;

    assert.isDefined(fourthProjectBoost);
    assert.isDefined(fifthProjectBoost);
    assert.isDefined(sixthProjectBoost);

    assert.equal(fourthProjectBoost.percentage, 19.99);
    assert.equal(fifthProjectBoost.percentage, 49.99);
    assert.equal(sixthProjectBoost.percentage, 29.99);

    await removePowerBoostings(powerBoostings);
  });

  it('should clear/override/create power boostings', async () => {
    await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [
        SEED_DATA.FIRST_PROJECT.id,
        SEED_DATA.SECOND_PROJECT.id,
        SEED_DATA.TRANSAK_PROJECT.id,
      ],
      [40, 30, 30],
    );

    const result = await sendMultipleBoostQuery(
      SEED_DATA.FIRST_USER.id,
      [
        SEED_DATA.FIRST_PROJECT.id, // Override
        SEED_DATA.SECOND_PROJECT.id, // Clear
        SEED_DATA.FOURTH_PROJECT.id, // Create
      ],
      [50, 0, 50],
    );

    assert.isOk(result);
    const powerBoostings = result.data.data.setMultiplePowerBoosting;

    assert.lengthOf(powerBoostings, 2);

    const firstProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.FIRST_PROJECT.id,
    ) as PowerBoosting;
    const fourthProjectBoost = powerBoostings.find(
      pb => +pb.project.id === SEED_DATA.FOURTH_PROJECT.id,
    ) as PowerBoosting;

    assert.isDefined(firstProjectBoost);
    assert.isDefined(fourthProjectBoost);

    assert.equal(firstProjectBoost.percentage, 50);
    assert.equal(fourthProjectBoost.percentage, 50);

    await removePowerBoostings(powerBoostings);
  });
}
