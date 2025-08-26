import { Arg, Mutation, Resolver } from 'type-graphql';
import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import { User } from '../entities/user';
import { ChainType } from '../types/network';
import { NETWORK_IDS } from '../provider';
import { logger } from '../utils/logger';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import config from '../config';

@Resolver()
export class CardanoDonationResolver {
  @Mutation(_returns => Number, { nullable: true })
  async createCardanoDonation(
    @Arg('amount') amount: number,
    @Arg('transactionId') transactionId: string,
    @Arg('projectId') projectId: number,
    @Arg('fromWalletAddress') fromWalletAddress: string,
    @Arg('toWalletAddress') toWalletAddress: string,
    @Arg('token', { defaultValue: 'ADA' }) token: string,
    @Arg('tokenAddress', { nullable: true }) tokenAddress?: string,
    @Arg('anonymous', { defaultValue: false }) anonymous?: boolean,
    @Arg('valueUsd', { nullable: true }) valueUsd?: number,
    @Arg('priceUsd', { nullable: true }) priceUsd?: number,
    @Arg('userId', { nullable: true }) userId?: number,
    @Arg('transactionNetworkId', { nullable: true })
    transactionNetworkId?: number,
  ): Promise<number | null> {
    // Only allow this resolver in staging/develop environments
    const environment = config.get('ENVIRONMENT') as string;
    if (
      environment !== 'staging' &&
      environment !== 'develop' &&
      environment !== 'local'
    ) {
      logger.warn(
        `createCardanoDonation() called in ${environment} environment - returning null`,
      );
      return null;
    }

    const logData = {
      amount,
      transactionId,
      projectId,
      fromWalletAddress,
      toWalletAddress,
      token,
      tokenAddress,
      anonymous,
      valueUsd,
      priceUsd,
      userId,
      transactionNetworkId,
    };

    logger.debug('createCardanoDonation() resolver called with data:', logData);

    try {
      // Find user by userId if provided, otherwise by wallet address
      let user: User | null = null;

      if (userId) {
        user = await User.findOne({ where: { id: userId } });
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }
        logger.debug(`Found user by ID: ${userId}`);
      } else {
        // Find or create user by wallet address
        user = await User.findOne({
          where: { walletAddress: fromWalletAddress.toLowerCase() },
        });

        if (!user) {
          // Create new user if doesn't exist
          user = await User.create({
            walletAddress: fromWalletAddress.toLowerCase(),
            loginType: 'wallet',
            firstName: 'Cardano User',
          }).save();
          logger.debug(`Created new user with wallet: ${fromWalletAddress}`);
        }
      }

      // Find project
      const project = await Project.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND),
        );
      }

      // Check if donation with this transaction ID already exists
      const existingDonation = await Donation.findOne({
        where: { transactionId: transactionId.toLowerCase() },
      });

      if (existingDonation) {
        throw new Error('Donation with this transaction ID already exists');
      }

      // Create donation
      const donation = await Donation.create({
        amount: Number(amount),
        transactionId: transactionId.toLowerCase(),
        transactionNetworkId: transactionNetworkId
          ? transactionNetworkId
          : NETWORK_IDS.CARDANO_MAINNET,
        currency: token,
        user,
        tokenAddress,
        project,
        isTokenEligibleForGivback: false, // Default to false for now
        isProjectGivbackEligible: project.isGivbackEligible,
        createdAt: new Date(),
        segmentNotified: false,
        toWalletAddress: toWalletAddress.toLowerCase(),
        fromWalletAddress: fromWalletAddress.toLowerCase(),
        anonymous: Boolean(anonymous),
        chainType: ChainType.CARDANO,
        valueUsd,
        priceUsd,
        status: 'verified', // Set as verified by default
        isQRDonation: false,
        speedup: false,
      }).save();

      logger.debug(`Created Cardano donation with ID: ${donation.id}`);
      return donation.id;
    } catch (error) {
      logger.error('Error creating Cardano donation:', error);
      throw error;
    }
  }
}
