import { assert } from 'chai';
import {
  graphqlUrl,
  saveCategoryDirectlyToDb,
  saveMainCategoryDirectlyToDb,
} from '../../test/testUtils';
import axios from 'axios';
import { errorMessages } from '../utils/errorMessages';
import {
  fetchAllDonationsQuery,
  getMainCategoriesData,
} from '../../test/graphqlQueries';
import { logger } from '../utils/logger';

describe('mainCategoryTestCases() test cases', mainCategoryTestCases);
describe('categoryTestCases() test cases', categoryTestCases);

function mainCategoryTestCases() {
  it('Should show main categories', async () => {
    const mainCategory = await saveMainCategoryDirectlyToDb({
      banner: '',
      description: '',
      slug: 'environment-and-energy-test',
      title: 'Economics & Infrastructure test',
      categories: [],
    });

    const category = await saveCategoryDirectlyToDb(
      {
        name: 'agriculture',
        mainCategory,
        value: 'Agriculture',
        isActive: true,
      },
      mainCategory.id,
    );
    const categoryResponse = await axios.post(graphqlUrl, {
      query: getMainCategoriesData,
      variables: {},
    });
    logger.debug('categoryResponse>>>', categoryResponse);
    assert.equal(
      categoryResponse.data.errors[0].message,
      errorMessages.INVALID_DATE_FORMAT,
    );
  });
}

// function categoryTestCases() {
//   it('Should show main categories', async () => {
//     const categoryResponse = await axios.post(graphqlUrl, {
//       query: fetchAllDonationsQuery,
//       variables: {},
//     });
//
//     assert.equal(
//       categoryResponse.data.errors[0].message,
//       errorMessages.INVALID_DATE_FORMAT,
//     );
//   });
// }
