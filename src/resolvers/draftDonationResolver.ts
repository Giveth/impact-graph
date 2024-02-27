import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { ApolloContext } from '../types/ApolloContext';
import { ProjStatus } from '../entities/project';
import { Token } from '../entities/token';
import { Repository } from 'typeorm';
import { User } from '../entities/user';
import SentryLogger from '../sentryLogger';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { isTokenAcceptableForProject } from '../services/donationService';
import {
  createDraftDonationQueryValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import { logger } from '../utils/logger';
import { findUserById } from '../repositories/userRepository';
import { findProjectRecipientAddressByNetworkId } from '../repositories/projectAddressRepository';
import { findProjectById } from '../repositories/projectRepository';
import { AppDataSource } from '../orm';
import { detectAddressChainType } from '../utils/networks';
import { ChainType } from '../types/network';
import { getAppropriateNetworkId } from '../services/chains';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';

const draftDonationEnabled = process.env.ENABLE_DRAFT_DONATION === 'true';

@Resolver(of => User)
export class DraftDonationResolver {
  private readonly donationRepository: Repository<DraftDonation>;
  constructor() {
    this.donationRepository =
      AppDataSource.getDataSource().getRepository(DraftDonation);
  }

  @Mutation(returns => Number)
  async createDraftDonation(
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
  ): Promise<Number> {
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
}
