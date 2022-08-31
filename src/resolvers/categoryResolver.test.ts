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
    const title = generateRandomString(10);
    await saveMainCategoryDirectlyToDb({
      banner: '',
      description: '',
      slug: generateRandomString(10),
      title,
    });

    const categoryResponse = await axios.post(graphqlUrl, {
      query: getMainCategoriesData,
      variables: {},
    });
    const result = categoryResponse.data.data.mainCategories;
    assert.isNotEmpty(result);

    assert.equal(result[result.length - 1].title, title);
  });
}

function categoryTestCases() {
  it('Should show  categories', async () => {
    const name = generateRandomString(10);
    const mainCategory = await saveMainCategoryDirectlyToDb({
      banner: '',
      description: '',
      slug: 'environment-and-energy-test2',
      title: 'Economics & Infrastructure test2',
    });

    await saveCategoryDirectlyToDb({
      name,
      mainCategory,
      value: 'Agriculture',
      isActive: true,
    });
    const categoryResponse = await axios.post(graphqlUrl, {
      query: getCategoryData,
      variables: {},
    });
    const result = categoryResponse?.data?.data?.categories;
    assert.isNotEmpty(result);
    categoryResponse.data.data.categories.forEach(item => {
      assert.isOk(item.mainCategory);
      assert.isOk(item.mainCategory.title);
    });

    assert.equal(result[result.length - 1].name, name);
  });
}
