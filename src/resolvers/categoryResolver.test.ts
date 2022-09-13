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
  it('Should show main categories and categories ordered alphabetically', async () => {
    const title = 'z' + generateRandomString(10); // ensure it's last
    const mainCategory = await saveMainCategoryDirectlyToDb({
      banner: '',
      description: '',
      slug: generateRandomString(10),
      title,
    });

    const title2 = 'a' + generateRandomString(10); // ensure it's first
    const mainCategory2 = await saveMainCategoryDirectlyToDb({
      banner: '',
      description: '',
      slug: generateRandomString(10),
      title: title2,
    });

    // save it's categories to sort them
    const name = 'z' + generateRandomString(10); // ensure it's last
    const category1 = await saveCategoryDirectlyToDb({
      name,
      mainCategory,
      value: 'Agriculture',
      isActive: true,
    });

    const name2 = 'a' + generateRandomString(10); // ensure it's first
    const category2 = await saveCategoryDirectlyToDb({
      name: name2,
      mainCategory,
      value: 'Agriculture',
      isActive: true,
    });

    const categoryResponse = await axios.post(graphqlUrl, {
      query: getMainCategoriesData,
      variables: {},
    });
    const result = categoryResponse.data.data.mainCategories;
    assert.isNotEmpty(result);

    assert.equal(result[0].title, mainCategory2.title);
    assert.equal(result[result.length - 1].title, mainCategory.title);

    // assert categories ordered alphabetically for maincategory1
    assert.equal(result[result.length - 1].categories[0].name, category2.name);
    assert.equal(result[result.length - 1].categories[1].name, category1.name);
  });
}

function categoryTestCases() {
  it('Should show categories ordered alphabetically', async () => {
    const mainCategory = await saveMainCategoryDirectlyToDb({
      banner: '',
      description: '',
      slug: 'environment-and-energy-test2',
      title: 'Economics & Infrastructure test2',
    });

    const name = 'zz' + generateRandomString(10); // ensure it's last
    const category1 = await saveCategoryDirectlyToDb({
      name,
      mainCategory,
      value: 'Agriculture',
      isActive: true,
    });

    const name2 = 'aa' + generateRandomString(10); // assert it's first
    const category2 = await saveCategoryDirectlyToDb({
      name: name2,
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
    assert.equal(result[0].mainCategory.title, mainCategory.title);

    assert.equal(result[0].name, category2.name);
    assert.equal(result[result.length - 1].name, category1.name);
  });
}
