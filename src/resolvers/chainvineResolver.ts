import {
  Arg,
  Ctx,
  Field,
  Int,
  Mutation,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import { ApolloContext } from '../types/ApolloContext';
import { errorMessages } from '../utils/errorMessages';
import { User } from '../entities/user';
import { findUserById } from '../repositories/userRepository';
import { getChainvineAdapter } from '../adapters/adaptersFactory';

@Resolver(of => User)
export class ChainvineResolver {
  @Mutation(returns => User, { nullable: true })
  async registerOnChainvine(
    @Ctx() { req: { user }, projectsFiltersThreadPool }: ApolloContext,
  ): Promise<User | void> {
    const userId = user?.userId;
    const dbUser = await findUserById(userId);
    if (!dbUser || !dbUser.walletAddress) {
      return;
    }

    const chainvineId = await getChainvineAdapter().generateChainvineId(
      dbUser.walletAddress,
    );

    if (!chainvineId) {
      return;
    }

    dbUser.chainvineId = chainvineId;
    await dbUser.save();

    return dbUser;
  }

  @Mutation(returns => User, { nullable: true })
  async registerClickEvent(
    @Arg('firstName', { nullable: true }) firstName: string,
    @Ctx() { req: { user }, projectsFiltersThreadPool }: ApolloContext,
  ): Promise<User | void> {
    const userId = user?.userId;
    const dbUser = await findUserById(userId);
    if (!dbUser || !dbUser.walletAddress) {
      return;
    }

    const chainvineId = await getChainvineAdapter().generateChainvineId(
      dbUser.walletAddress,
    );

    if (!chainvineId) {
      return;
    }

    dbUser.chainvineId = chainvineId;
    await dbUser.save();

    return dbUser;
  }
}
