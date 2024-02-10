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
import { DraftDonation } from '../entities/draftDonation';

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
      'createDonation() resolver has been called with this data',
      logData,
    );
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

      const project = await findProjectById(projectId);

      if (!project)
        throw new Error(
          i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND),
        );
      if (project.status.id !== ProjStatus.active) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
          ),
        );
      }
      const tokenInDb = await Token.findOne({
        where: {
          networkId,
          symbol: token,
        },
      });
      const isCustomToken = !Boolean(tokenInDb);
      let isTokenEligibleForGivback = false;
      if (isCustomToken && !project.organization.supportCustomTokens) {
        throw new Error(i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND));
      } else if (tokenInDb) {
        const acceptsToken = await isTokenAcceptableForProject({
          projectId,
          tokenId: tokenInDb.id,
        });
        if (!acceptsToken && !project.organization.supportCustomTokens) {
          throw new Error(
            i18n.__(
              translationErrorMessagesKeys.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
            ),
          );
        }
        isTokenEligibleForGivback = tokenInDb.isGivbackEligible;
      }
      const projectRelatedAddress =
        await findProjectRecipientAddressByNetworkId({
          projectId,
          networkId,
        });
      if (!projectRelatedAddress) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT,
          ),
        );
      }
      let toAddress = projectRelatedAddress?.address;
      let fromAddress = donorUser.walletAddress!;

      // Keep the flow the same as before if it's EVM
      if (chainType === ChainType.EVM) {
        toAddress = toAddress?.toLowerCase();
        fromAddress = fromAddress?.toLowerCase();
      }

      const draftDonation = await DraftDonation.create({
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
      });

      await draftDonation.save();

      return draftDonation.id;
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
