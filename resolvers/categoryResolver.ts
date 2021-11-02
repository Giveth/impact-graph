import { Resolver, Query, Arg, Int } from 'type-graphql';
import { Repository, In } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { User } from '../entities/user';
import { Category } from '../entities/category';

@Resolver(of => User)
export class CategoryResolver {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  @Query(returns => [Category], { nullable: true })
  categories() {
    return this.categoryRepository.find();
  }
}
