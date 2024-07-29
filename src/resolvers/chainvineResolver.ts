import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { ApolloContext } from '../types/ApolloContext.js';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages.js';
import { logger } from '../utils/logger.js';
import { User } from '../entities/user.js';
import {
  findUserById,
  findUserByWalletAddress,
} from '../repositories/userRepository.js';
import { getChainvineAdapter } from '../adapters/adaptersFactory.js';
import { firstOrCreateReferredEventByUserId } from '../repositories/referredEventRepository.js';

@Resolver(_of => User)
export class ChainvineResolver {
  @Mutation(_returns => User, { nullable: true })
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
        // @ts-expect-error migrate to esm
        dbUser.walletAddress,
      );

      dbUser.isReferrer = true;
      dbUser.chainvineId = chainvineId!;
      await dbUser.save();

      return dbUser;
    } catch (e) {
      logger.error('Chainvine registration error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.CHAINVINE_REGISTRATION_ERROR),
      );
    }
  }

  @Mutation(_returns => User, { nullable: true })
  async registerClickEvent(
    @Arg('referrerId', { nullable: false }) referrerId: string,
    @Arg('walletAddress', { nullable: false }) walletAddress: string,
  ): Promise<User | void> {
    if (!walletAddress)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const dbUser = await findUserByWalletAddress(walletAddress);
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
        // @ts-expect-error migrate to esm
        await getChainvineAdapter().registerClickEvent(referrerId);
        referredEvent.isDonorClickEventSent = true;
        await referredEvent.save();
      }

      if (!referredEvent.isDonorLinkedToReferrer) {
        // @ts-expect-error migrate to esm
        await getChainvineAdapter().linkDonorToReferrer({
          walletAddress: dbUser.walletAddress,
          referrerId,
        });

        referredEvent.referrerId = referrerId;
        referredEvent.isDonorLinkedToReferrer = true;
        await referredEvent.save();
      }

      dbUser.wasReferred = true;
      return await dbUser.save();
    } catch (e) {
      logger.error('Chainvine click event error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.CHAINVINE_CLICK_EVENT_ERROR),
      );
    }
  }
}
