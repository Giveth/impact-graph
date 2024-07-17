import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { Repository } from 'typeorm';
import { ApolloContext } from '../types/ApolloContext';
import { User } from '../entities/user';
import SentryLogger from '../sentryLogger';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import {
  createDraftDonationQueryValidator,
  createDraftRecurringDonationQueryValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import { logger } from '../utils/logger';
import { findUserById } from '../repositories/userRepository';
import { AppDataSource } from '../orm';
import { detectAddressChainType } from '../utils/networks';
import { ChainType } from '../types/network';
import { getAppropriateNetworkId } from '../services/chains';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';
import { DraftRecurringDonation } from '../entities/draftRecurringDonation';
import {
  findRecurringDonationById,
  findRecurringDonationByProjectIdAndUserIdAndCurrency,
} from '../repositories/recurringDonationRepository';
import { RecurringDonation } from '../entities/recurringDonation';

const draftDonationEnabled = process.env.ENABLE_DRAFT_DONATION === 'true';
const draftRecurringDonationEnabled =
  process.env.ENABLE_DRAFT_RECURRING_DONATION === 'true';

@Resolver(_of => User)
export class DraftDonationResolver {
  private readonly donationRepository: Repository<DraftDonation>;

  constructor() {
    this.donationRepository =
      AppDataSource.getDataSource().getRepository(DraftDonation);
  }

  @Mutation(_returns => Number)
  async createDraftDonation(
    // TODO we should change it to bigInt in both backend and frontend to not round numbers
    @Arg('amount') amount: number,
    @Arg('networkId') networkId: number,
    @Arg('tokenAddress', { nullable: true }) tokenAddress: string,
    @Arg('anonymous', { nullable: true }) anonymous: boolean,
    @Arg('token') token: string,
    @Arg('projectId') projectId: number,
    @Arg('toAddress', { nullable: true }) toAddress: string,
    @Ctx() ctx: ApolloContext,
    @Arg('referrerId', { nullable: true }) referrerId?: string,
    @Arg('safeTransactionId', { nullable: true }) safeTransactionId?: string,
    @Arg('useDonationBox', { nullable: true, defaultValue: false })
    useDonationBox?: boolean,
    @Arg('relevantDonationTxHash', { nullable: true })
    relevantDonationTxHash?: string,
  ): Promise<number> {
    const logData = {
      amount,
      networkId,
      tokenAddress,
      anonymous,
      token,
      projectId,
      referrerId,
      userId: ctx?.req?.user?.userId,
    };
    logger.debug(
      'createDraftDonation() resolver has been called with this data',
      logData,
    );
    if (!draftDonationEnabled) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.DRAFT_DONATION_DISABLED),
      );
    }
    try {
      const userId = ctx?.req?.user?.userId;
      const donorUser = await findUserById(userId);
      if (!donorUser) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }
      const chainType = detectAddressChainType(donorUser.walletAddress!);
      const _networkId = getAppropriateNetworkId({
        networkId,
        chainType,
      });

      const validaDataInput = {
        amount,
        networkId: _networkId,
        anonymous,
        tokenAddress,
        token,
        projectId,
        referrerId,
        safeTransactionId,
        chainType,
        useDonationBox,
        relevantDonationTxHash,
      };
      try {
        validateWithJoiSchema(
          validaDataInput,
          createDraftDonationQueryValidator,
        );
      } catch (e) {
        logger.error(
          'Error on validating createDraftDonation input',
          validaDataInput,
        );
        throw e; // Rethrow the original error
      }

      let fromAddress = donorUser.walletAddress!;

      if (chainType !== ChainType.EVM) {
        throw new Error(i18n.__(translationErrorMessagesKeys.EVM_SUPPORT_ONLY));
      }

      toAddress = toAddress?.toLowerCase();
      fromAddress = fromAddress?.toLowerCase();

      const draftDonationId = await DraftDonation.createQueryBuilder(
        'draftDonation',
      )
        .insert()
        .values({
          amount: Number(amount),
          networkId: _networkId,
          currency: token,
          userId: donorUser.id,
          tokenAddress,
          projectId,
          toWalletAddress: toAddress,
          fromWalletAddress: fromAddress,
          anonymous: Boolean(anonymous),
          chainType: chainType as ChainType,
          referrerId,
          useDonationBox,
          relevantDonationTxHash,
        })
        .orIgnore()
        .returning('id')
        .execute();

      if (draftDonationId.raw.length === 0) {
        const existsingDraftDonation = await DraftDonation.findOne({
          where: {
            networkId: _networkId,
            toWalletAddress: toAddress,
            fromWalletAddress: fromAddress,
            amount,
            currency: token,
            status: DRAFT_DONATION_STATUS.PENDING,
          },
          select: ['id'],
        });
        return existsingDraftDonation!.id;
      }
      return draftDonationId.raw[0].id;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('createDraftDonation() error', {
        error: e,
        inputData: logData,
      });
      throw e;
    }
  }

  @Mutation(_returns => Number)
  async createDraftRecurringDonation(
    @Arg('networkId') networkId: number,
    @Arg('flowRate') flowRate: string,
    @Arg('currency') currency: string,
    @Arg('isBatch', { nullable: true, defaultValue: false }) isBatch: boolean,
    @Arg('anonymous', { nullable: true, defaultValue: false })
    anonymous: boolean,
    @Arg('projectId') projectId: number,
    @Ctx() ctx: ApolloContext,
    @Arg('recurringDonationId', { nullable: true })
    recurringDonationId?: number,
    @Arg('isForUpdate', { nullable: true, defaultValue: false })
    isForUpdate?: boolean,
  ): Promise<number> {
    const logData = {
      flowRate,
      networkId,
      currency,
      anonymous,
      isBatch,
      isForUpdate,
      recurringDonationId,
      projectId,
      userId: ctx?.req?.user?.userId,
    };
    logger.debug(
      'createDraftRecurringDonation() resolver has been called with this data',
      logData,
    );
    if (!draftRecurringDonationEnabled) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.DRAFT_RECURRING_DONATION_DISABLED),
      );
    }
    try {
      const userId = ctx?.req?.user?.userId;
      const donorUser = await findUserById(userId);
      if (!donorUser) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }
      const chainType = detectAddressChainType(donorUser.walletAddress!);
      const _networkId = getAppropriateNetworkId({
        networkId,
        chainType,
      });

      const validaDataInput = {
        flowRate,
        networkId: _networkId,
        anonymous,
        currency,
        isBatch,
        projectId,
        chainType,
        isForUpdate,
        recurringDonationId,
      };
      try {
        validateWithJoiSchema(
          validaDataInput,
          createDraftRecurringDonationQueryValidator,
        );
      } catch (e) {
        logger.error(
          'Error on validating createDraftRecurringDonation input',
          validaDataInput,
        );
        throw e; // Rethrow the original error
      }
      let recurringDonation: RecurringDonation | null;
      if (recurringDonationId && isForUpdate) {
        recurringDonation =
          await findRecurringDonationById(recurringDonationId);
        if (!recurringDonation || recurringDonation.donorId !== donorUser.id) {
          throw new Error(
            i18n.__(translationErrorMessagesKeys.RECURRING_DONATION_NOT_FOUND),
          );
        }
      } else if (isForUpdate) {
        recurringDonation =
          await findRecurringDonationByProjectIdAndUserIdAndCurrency({
            projectId,
            userId: donorUser.id,
            currency,
          });
        if (!recurringDonation || recurringDonation.donorId !== donorUser.id) {
          throw new Error(
            i18n.__(translationErrorMessagesKeys.RECURRING_DONATION_NOT_FOUND),
          );
        }
      }
      if (chainType !== ChainType.EVM) {
        throw new Error(i18n.__(translationErrorMessagesKeys.EVM_SUPPORT_ONLY));
      }

      const draftRecurringDonationId =
        await DraftRecurringDonation.createQueryBuilder(
          'draftRecurringDonation',
        )
          .insert()
          .values({
            networkId: _networkId,
            currency,
            flowRate,
            donorId: donorUser.id,
            isBatch,
            projectId,
            isForUpdate,
            anonymous: Boolean(anonymous),
            chainType: chainType as ChainType,
            matchedRecurringDonationId: recurringDonationId,
          })
          .orIgnore()
          .returning('id')
          .execute();

      if (draftRecurringDonationId.raw.length === 0) {
        // TODO unreached code, because we dont have any unique index on this table, so we need to think about it
        const existingDraftDonation = await DraftRecurringDonation.findOne({
          where: {
            networkId: _networkId,
            currency,
            projectId,
            donorId: donorUser.id,
            flowRate,
          },
          select: ['id'],
        });
        return existingDraftDonation!.id;
      }
      return draftRecurringDonationId.raw[0].id;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('createDraftRecurringDonation() error', {
        error: e,
        inputData: logData,
      });
      throw e;
    }
  }
}
