import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
} from '../../test/testUtils';
import axios from 'axios';
import { boostSingleProjectMutation } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { errorMessages } from '../utils/errorMessages';

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

    assert.equal(result.status, 200);
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

    assert.equal(result.status, 200);
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

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT,
    );
  });
}
