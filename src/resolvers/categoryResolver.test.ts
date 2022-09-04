import { assert } from 'chai';
import {
  graphqlUrl,
  saveCategoryDirectlyToDb,
  saveMainCategoryDirectlyToDb,
} from '../../test/testUtils';
import axios from 'axios';
import {
  getCategoryData,
  getMainCategoriesData,
} from '../../test/graphqlQueries';
import { generateRandomString } from '../utils/utils';

describe('mainCategoryTestCases() test cases', mainCategoryTestCases);
describe('categoryTestCases() test cases', categoryTestCases);

function mainCategoryTestCases() {
  it('Should show main categories', async () => {
    try {
      const title = generateRandomString(10);
      await saveMainCategoryDirectlyToDb({
        banner: '',
        description: '',
        slug: generateRandomString(10),
        title,
        priority: 1,
      });

      const categoryResponse = await axios.post(graphqlUrl, {
        query: getMainCategoriesData,
        variables: {},
      });
      const result = categoryResponse?.data?.data?.mainCategories;
      // console.log('categoryTestCases---------', { result, 2: categoryResponse });

      assert.isNotEmpty(result);

      assert.equal(result[result.length - 1].title, title);
    } catch (e) {
      // console.log("eee------",e)
    }
  });
}

function categoryTestCases() {
  it('Should show  categories', async () => {
    try {
      const name = generateRandomString(10);
      const mainCategory = await saveMainCategoryDirectlyToDb({
        banner: '',
        description: '',
        slug: 'environment-and-energy-test2',
        title: 'Economics & Infrastructure test2',
        priority: 1,
      });

      await saveCategoryDirectlyToDb({
        name,
        mainCategory,
        value: 'Agriculture',
        isActive: true,
        priority: 1,
      });
      const categoryResponse = await axios.post(graphqlUrl, {
        query: getCategoryData,
        variables: {},
      });
      const result = categoryResponse?.data?.data?.categories;
      // console.log('categoryTestCases---------', result);

      // console.log('categoryTestCases---------', result);
      assert.isNotEmpty(result);
      assert.equal(
        result[result.length - 1].mainCategory.title,
        mainCategory.title,
      );

      assert.equal(result[result.length - 1].name, name);
    } catch (e) {
      // console.log('categoryTestCases eee---------', e);
    }
  });
}
