import { Query, Resolver } from 'type-graphql';
import { Repository } from 'typeorm';

import { User } from '../entities/user.js';
import { Category } from '../entities/category.js';
import { MainCategory } from '../entities/mainCategory.js';
import { AppDataSource } from '../orm.js';
import config from '../config.js';

const qfRoundsAndMainCategoryCacheDuration =
  (config.get('QF_ROUND_AND_MAIN_CATEGORIES_CACHE_DURATION') as number) ||
  1000 * 60 * 15;

@Resolver(_of => User)
export class CategoryResolver {
  constructor(
    private readonly categoryRepository: Repository<Category>,
    // @ts-expect-error migrate to ESM
    private readonly mainCategoryRepository: Repository<MainCategory>,
  ) {
    this.categoryRepository =
      AppDataSource.getDataSource().getRepository(Category);
    this.mainCategoryRepository =
      AppDataSource.getDataSource().getRepository(MainCategory);
  }

  @Query(_returns => [Category], { nullable: true })
  async categories() {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.mainCategory', 'mainCategory')
      .where(`category."isActive"=true`)
      .andWhere(`category."isActive"=true`)
      .orderBy({
        'category.name': 'ASC',
      })
      .getMany();
  }
  @Query(_returns => [MainCategory], { nullable: true })
  async mainCategories() {
    return MainCategory.createQueryBuilder('mainCategory')
      .innerJoinAndSelect(
        'mainCategory.categories',
        'categories',
        `categories."isActive"=true`,
      )
      .where(`"mainCategory"."isActive"=true`)
      .orderBy({
        'mainCategory.title': 'ASC',
        'categories.name': 'ASC',
      })
      .cache('mainCategories', qfRoundsAndMainCategoryCacheDuration)
      .getMany();
  }
}
