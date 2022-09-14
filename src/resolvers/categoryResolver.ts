import { Resolver, Query, Arg, Int } from 'type-graphql';
import { Repository, In } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { publicSelectionFields, User } from '../entities/user';
import { Category } from '../entities/category';
import { MainCategory } from '../entities/mainCategory';

@Resolver(of => User)
export class CategoryResolver {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  @Query(returns => [Category], { nullable: true })
  async categories() {
    return Category.createQueryBuilder('category')
      .leftJoinAndSelect('category.mainCategory', 'mainCategory')
      .orderBy({
        'category.name': 'ASC',
      })
      .getMany();
  }
  @Query(returns => [MainCategory], { nullable: true })
  async mainCategories() {
    return MainCategory.createQueryBuilder('mainCategory')
      .leftJoinAndSelect('mainCategory.categories', 'categories')
      .orderBy({
        'mainCategory.title': 'ASC',
        'categories.name': 'ASC',
      })
      .getMany();
  }
}
