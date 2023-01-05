import { Query, Resolver } from 'type-graphql';
import { Repository } from 'typeorm';

import { User } from '../entities/user';
import { Category } from '../entities/category';
import { MainCategory } from '../entities/mainCategory';
import { AppDataSource } from '../orm';

@Resolver(of => User)
export class CategoryResolver {
  constructor(
    private readonly categoryRepository: Repository<Category>,
    private readonly mainCategoryRepository: Repository<MainCategory>,
  ) {
    this.categoryRepository =
      AppDataSource.getDataSource().getRepository(Category);
    this.mainCategoryRepository =
      AppDataSource.getDataSource().getRepository(MainCategory);
  }

  @Query(returns => [Category], { nullable: true })
  async categories() {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.mainCategory', 'mainCategory')
      .where(`"isActive"=true`)
      .orderBy({
        'category.name': 'ASC',
      })
      .getMany();
  }
  @Query(returns => [MainCategory], { nullable: true })
  async mainCategories() {
    return MainCategory.createQueryBuilder('mainCategory')
      .innerJoinAndSelect(
        'mainCategory.categories',
        'categories',
        `"isActive"=true`,
      )
      .orderBy({
        'mainCategory.title': 'ASC',
        'categories.name': 'ASC',
      })
      .getMany();
  }
}
