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
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { User } from '../entities/user';
import { findUserById } from '../repositories/userRepository';
import { getChainvineAdapter } from '../adapters/adaptersFactory';
import { firstOrCreateReferredEventByUserId } from '../repositories/referredEventRepository';

@Resolver(of => User)
export class ChainvineResolver {
  @Mutation(returns => User, { nullable: true })
  async registerOnChainvine(
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<User | void> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const userId = user?.userId;
    const dbUser = await findUserById(userId);
    if (!dbUser || !dbUser.walletAddress) {
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
    }

    try {
      const chainvineId = await getChainvineAdapter().generateChainvineId(
        dbUser.walletAddress,
      );

      dbUser.chainvineId = chainvineId!;
      await dbUser.save();

      return dbUser;
    } catch (e) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.CHAINVINE_REGISTRATION_ERROR),
      );
    }
  }

  @Mutation(returns => User, { nullable: true })
  async registerClickEvent(
    @Arg('referrerId', { nullable: false }) referrerId: string,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<User | void> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const userId = user?.userId;
    const dbUser = await findUserById(userId);
    if (!dbUser || !dbUser.walletAddress) {
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
    }

    const referredEvent = await firstOrCreateReferredEventByUserId(dbUser.id);

    try {
      if (!referredEvent.startTime) {
        referredEvent.startTime = new Date();
        await referredEvent.save();
      }

      if (!referredEvent.isDonorClickEventSent) {
        await getChainvineAdapter().registerClickEvent(referrerId);
        referredEvent.isDonorClickEventSent = true;
        await referredEvent.save();
      }

      if (referredEvent.isDonorLinkedToReferrer) {
        await getChainvineAdapter().linkDonorToReferrer({
          walletAddress: dbUser.walletAddress,
          referrerId,
        });

        referredEvent.isDonorLinkedToReferrer = true;
        await referredEvent.save();
      }

      dbUser.wasReferred = true;
      await dbUser.save();
      return dbUser;
    } catch (e) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.CHAINVINE_CLICK_EVENT_ERROR),
      );
    }
  }
}
