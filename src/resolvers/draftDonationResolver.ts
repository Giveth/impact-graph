import { Arg, Ctx, Mutation, Query, Resolver, Int } from 'type-graphql';
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
import { findQfRoundById } from '../repositories/qfRoundRepository';
import { DraftRecurringDonation } from '../entities/draftRecurringDonation';
import {
  findRecurringDonationById,
  findRecurringDonationByProjectIdAndUserIdAndCurrency,
} from '../repositories/recurringDonationRepository';
import { RecurringDonation } from '../entities/recurringDonation';
import { checkTransactions } from '../services/cronJobs/checkQRTransactionJob';
import { findProjectById } from '../repositories/projectRepository';
import { notifyDonationFailed } from '../services/sse/sse';

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
    @Arg('toWalletMemo', { nullable: true }) toWalletMemo?: string,
    @Arg('qrCodeDataUrl', { nullable: true }) qrCodeDataUrl?: string,
    @Arg('isQRDonation', { nullable: true, defaultValue: false })
    isQRDonation?: boolean,
    @Arg('fromTokenAmount', { nullable: true }) fromTokenAmount?: number,
    @Arg('roundId', { nullable: true }) roundId?: number,
  ): Promise<number> {
    const logData = {
      amount,
      networkId,
      tokenAddress,
      anonymous,
      token,
      projectId,
      referrerId,
      toWalletMemo,
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
      const project = await findProjectById(projectId);

      if (!donorUser && !isQRDonation) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }

      if (!!isQRDonation && !qrCodeDataUrl) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.QR_CODE_DATA_URL_REQUIRED),
        );
      }

      if (!project)
        throw new Error(
          i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND),
        );

      const ownProject = isQRDonation
        ? false
        : project.adminUserId === donorUser?.id;

      if (ownProject) {
        throw new Error(
          "Donor can't create a draft to donate to his/her own project.",
        );
      }

      const chainType = isQRDonation
        ? detectAddressChainType(toAddress)
        : detectAddressChainType(donorUser?.walletAddress ?? '');

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
        toWalletMemo,
        qrCodeDataUrl,
        isQRDonation,
        fromTokenAmount,
        roundId,
      };
      try {
        validateWithJoiSchema(
          validaDataInput,
          createDraftDonationQueryValidator,
        );
      } catch (e) {
        logger.error('Error on validating createDraftDonation input', {
          validaDataInput,
          error: e,
        });
        throw e; // Rethrow the original error
      }

      let fromAddress = isQRDonation ? '' : donorUser?.walletAddress;

      if (chainType !== ChainType.EVM && chainType !== ChainType.STELLAR) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.EVM_AND_STELLAR_SUPPORT_ONLY),
        );
      }

      toAddress =
        chainType === ChainType.STELLAR
          ? toAddress?.toUpperCase()
          : toAddress.toLowerCase();

      if (fromAddress)
        fromAddress =
          chainType === ChainType.STELLAR
            ? fromAddress.toUpperCase()
            : fromAddress.toLowerCase();

      // QF Round validation and assignment
      let qfRound: any = null;
      if (roundId) {
        qfRound = await findQfRoundById(roundId);
        if (!qfRound) {
          throw new Error('QF round not found');
        }
        if (!qfRound.isActive) {
          throw new Error('QF round is not active');
        }
        const now = new Date();
        if (now < qfRound.beginDate || now > qfRound.endDate) {
          throw new Error('QF round is not currently active');
        }
        if (!qfRound.isEligibleNetwork(_networkId)) {
          throw new Error('QF round is not eligible for this network');
        }
        // Check if project is in the QF round
        const projectInQfRound = project.qfRounds?.some(
          qr => qr.id === roundId,
        );
        if (!projectInQfRound) {
          throw new Error('Project is not part of the specified QF round');
        }
      }

      const expiresAt = isQRDonation
        ? new Date(Date.now() + 15 * 60 * 1000)
        : undefined;

      const draftDonationId = await DraftDonation.createQueryBuilder(
        'draftDonation',
      )
        .insert()
        .values({
          amount: Number(amount),
          fromTokenAmount:
            fromTokenAmount !== undefined && fromTokenAmount !== null
              ? Number(fromTokenAmount)
              : 0,
          networkId: _networkId,
          currency: token,
          userId: isQRDonation && anonymous ? undefined : donorUser?.id,
          tokenAddress,
          projectId,
          toWalletAddress: toAddress,
          fromWalletAddress: fromAddress ?? '',
          anonymous: Boolean(anonymous),
          chainType: chainType as ChainType,
          referrerId,
          useDonationBox,
          relevantDonationTxHash,
          toWalletMemo,
          qrCodeDataUrl,
          isQRDonation,
          expiresAt,
          createdAt: new Date(),
          qfRoundId: qfRound?.id,
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
        logger.error('Error on validating createDraftRecurringDonation input', {
          validaDataInput,
          error: e,
        });
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

  // get draft donation by id
  @Query(_returns => DraftDonation, { nullable: true })
  async getDraftDonationById(
    @Arg('id', _type => Int) id: number,
  ): Promise<DraftDonation | null> {
    const draftDonation = await DraftDonation.createQueryBuilder(
      'draftDonation',
    )
      .where('draftDonation.id = :id', { id })
      .getOne();

    if (!draftDonation) return null;

    if (
      draftDonation.expiresAt &&
      new Date(draftDonation.expiresAt).getTime < new Date().getTime
    ) {
      await DraftDonation.update({ id }, { status: 'failed' });
      draftDonation.status = 'failed';
    }

    return draftDonation;
  }

  @Mutation(_returns => Boolean)
  async markDraftDonationAsFailed(
    @Arg('id', _type => Int) id: number,
  ): Promise<boolean> {
    try {
      const draftDonation = await DraftDonation.createQueryBuilder(
        'draftDonation',
      )
        .where('draftDonation.id = :id', { id })
        .getOne();

      if (!draftDonation) return false;

      if (draftDonation.status === DRAFT_DONATION_STATUS.FAILED) {
        return true;
      }

      if (
        !draftDonation.isQRDonation ||
        draftDonation.status === DRAFT_DONATION_STATUS.MATCHED
      )
        return false;

      await DraftDonation.update(
        { id },
        { status: DRAFT_DONATION_STATUS.FAILED },
      );

      // Notify clients of new donation
      notifyDonationFailed({
        type: 'draft-donation-failed',
        data: {
          draftDonationId: id,
          expiresAt: draftDonation.expiresAt,
        },
      });

      return true;
    } catch (e) {
      logger.error(
        `Error in markDraftDonationAsFailed - id: ${id} - error: ${e.message}`,
      );
      return false;
    }
  }

  @Mutation(_returns => DraftDonation)
  async renewDraftDonationExpirationDate(
    @Arg('id', _type => Int) id: number,
  ): Promise<DraftDonation | null> {
    try {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const draftDonation = await DraftDonation.createQueryBuilder(
        'draftDonation',
      )
        .where('draftDonation.id = :id', { id })
        .andWhere('draftDonation.isQRDonation = :isQRDonation', {
          isQRDonation: true,
        })
        .andWhere('draftDonation.status != :status', {
          status: DRAFT_DONATION_STATUS.MATCHED,
        })
        .getOne();

      if (!draftDonation) {
        throw new Error(translationErrorMessagesKeys.DRAFT_DONATION_NOT_FOUND);
      }

      await DraftDonation.update({ id }, { expiresAt, status: 'pending' });

      return {
        ...draftDonation,
        expiresAt,
      } as DraftDonation;
    } catch (e) {
      logger.error(
        `Error in renewDraftDonationExpirationDate - id: ${id} - error: ${e.message}`,
      );
      return null;
    }
  }

  @Query(_returns => DraftDonation, { nullable: true })
  async verifyQRDonationTransaction(
    @Arg('id', _type => Int) id: number,
  ): Promise<DraftDonation | null> {
    try {
      const draftDonation = await DraftDonation.createQueryBuilder(
        'draftDonation',
      )
        .where('draftDonation.id = :id', { id })
        .getOne();

      if (!draftDonation) return null;

      if (draftDonation.isQRDonation) {
        await checkTransactions(draftDonation);
      }

      return await DraftDonation.createQueryBuilder('draftDonation')
        .where('draftDonation.id = :id', { id })
        .getOne();
    } catch (e) {
      logger.error(
        `Error in fetchDaftDonationWithUpdatedStatus - id: ${id} - error: ${e.message}`,
      );
      return null;
    }
  }
}
