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
    const query = `
      SELECT * FROM category
      LEFT JOIN main_category
      ON category."mainCategoryId" = "main_category".id
      ORDER BY "main_category".priority
      NULLS LAST,
      category.priority;
    `;
    // return Category.createQueryBuilder('category')
    //   .leftJoinAndSelect('category.mainCategory', 'mainCategory')
    //   .getMany();
    return Category.query(query);
  }
  @Query(returns => [MainCategory], { nullable: true })
  async mainCategories() {
    const query = `
      SELECT * FROM main_category
      LEFT JOIN category
      ON category."mainCategoryId" = "main_category".id
      ORDER BY category.priority
      NULLS LAST,
      "main_category".priority;
    `;
    return MainCategory.query(query);

    // return MainCategory.createQueryBuilder('mainCategory')
    //   .leftJoinAndSelect('mainCategory.categories', 'categories')
    //   .getMany();
  }
}
