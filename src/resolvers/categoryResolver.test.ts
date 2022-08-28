import { assert } from 'chai';
import { graphqlUrl } from '../../test/testUtils';
import axios from 'axios';
import { errorMessages } from '../utils/errorMessages';
import { fetchAllDonationsQuery } from '../../test/graphqlQueries';

describe('mainCategoryTestCases() test cases', mainCategoryTestCases);
describe('categoryTestCases() test cases', categoryTestCases);

function mainCategoryTestCases() {
  it('Should show main categories', async () => {
    const categoryResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        fromDate: '20221203 10:12:30 and status=verified',
      },
    });

    assert.equal(
      categoryResponse.data.errors[0].message,
      errorMessages.INVALID_DATE_FORMAT,
    );
  });
}

function categoryTestCases() {
  it('Should show main categories', async () => {
    const categoryResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        fromDate: '20221203 10:12:30 and status=verified',
      },
    });

    assert.equal(
      categoryResponse.data.errors[0].message,
      errorMessages.INVALID_DATE_FORMAT,
    );
  });
}
