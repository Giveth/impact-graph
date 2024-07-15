import moment from 'moment';
import { MoreThan } from 'typeorm';
import { Project } from '../entities/project.js';
import { User } from '../entities/user.js';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../entities/recurringDonation.js';
import { AnchorContractAddress } from '../entities/anchorContractAddress.js';
import { logger } from '../utils/logger.js';

export const createNewRecurringDonation = async (params: {
  project: Project;
  donor: User;
  anchorContractAddress: AnchorContractAddress;
  networkId: number;
  txHash: string;
  flowRate: string;
  currency: string;
  anonymous: boolean;
  isBatch: boolean;
  totalUsdStreamed?: number;
}): Promise<RecurringDonation> => {
  const recurringDonation = RecurringDonation.create({
    project: params.project,
    donor: params.donor,
    anchorContractAddress: params.anchorContractAddress,
    networkId: params.networkId,
    txHash: params.txHash,
    currency: params.currency,
    flowRate: params.flowRate,
    anonymous: params.anonymous,
    isBatch: params.isBatch,
    totalUsdStreamed: params.totalUsdStreamed,
  });
  return recurringDonation.save();
};
export const updateRecurringDonation = async (params: {
  recurringDonation: RecurringDonation;
  txHash?: string;
  flowRate?: string;
  anonymous?: boolean;
  isArchived?: boolean;
  status?: string;
}): Promise<RecurringDonation> => {
  const { recurringDonation, txHash, anonymous, flowRate, status, isArchived } =
    params;
  if (txHash && flowRate) {
    recurringDonation.txHash = txHash;
    recurringDonation.flowRate = flowRate;
    recurringDonation.finished = false;
    recurringDonation.isArchived = false;
    recurringDonation.status = RECURRING_DONATION_STATUS.PENDING;
  }

  if (anonymous) {
    recurringDonation.anonymous = anonymous;
  }

  if (
    recurringDonation.status === RECURRING_DONATION_STATUS.ACTIVE &&
    status === RECURRING_DONATION_STATUS.ENDED
  ) {
    recurringDonation.status = status;
    recurringDonation.finished = true;
  }

  if (
    recurringDonation.status === RECURRING_DONATION_STATUS.ENDED &&
    isArchived
  ) {
    recurringDonation.isArchived = true;
  } else if (isArchived === false) {
    // isArchived can be undefined, so we need to check if it's false
    recurringDonation.isArchived = false;
  }

  return recurringDonation.save();
};

// TODO Need to write test cases for this function
export const findActiveRecurringDonations = async (): Promise<
  RecurringDonation[]
> => {
  // Return not finished recurring donations
  return RecurringDonation.find({
    where: {
      finished: false,
    },
  });
};

export const updateRecurringDonationFromTheStreamDonations = async (
  recurringDonationId: number,
) => {
  try {
    await RecurringDonation.query(
      `
      UPDATE "recurring_donation"
      SET "totalUsdStreamed" = (
        SELECT COALESCE(SUM(d."valueUsd"), 0)
        FROM donation as d
        WHERE d."recurringDonationId" = $1
      ),
      "amountStreamed" = (
        SELECT COALESCE(SUM(d."amount"), 0)
        FROM donation as d
        WHERE d."recurringDonationId" = $1
      )
      WHERE "id" = $1
    `,
      [recurringDonationId],
    );
  } catch (e) {
    logger.error('updateRecurringDonationFromTheStreamDonations() error', e);
  }
};

export const findRecurringDonationById = async (
  id: number,
): Promise<RecurringDonation | null> => {
  return await RecurringDonation.createQueryBuilder('recurringDonation')
    .innerJoinAndSelect(
      `recurringDonation.anchorContractAddress`,
      'anchorContractAddress',
    )
    .leftJoinAndSelect(`recurringDonation.donations`, 'donations')
    .leftJoinAndSelect('recurringDonation.project', 'project')
    .leftJoinAndSelect(`recurringDonation.donor`, 'donor')
    .where(`recurringDonation.id = :id`, { id })
    .getOne();
};

export const nonZeroRecurringDonationsByProjectId = async (
  projectId: number,
): Promise<number> => {
  return await RecurringDonation.createQueryBuilder('recurringDonation')
    .where(`recurringDonation.projectId = :projectId`, { projectId })
    .andWhere('recurringDonation.totalUsdStreamed > 0')
    .getCount();
};

export const findRecurringDonationByProjectIdAndUserIdAndCurrency =
  async (params: {
    projectId: number;
    userId: number;
    currency: string;
  }): Promise<RecurringDonation | null> => {
    return RecurringDonation.createQueryBuilder('recurringDonation')
      .where(`recurringDonation.projectId = :projectId`, {
        projectId: params.projectId,
      })
      .andWhere(`recurringDonation.donorId = :userId`, {
        userId: params.userId,
      })
      .andWhere(`recurringDonation.currency = :currency`, {
        currency: params.currency,
      })
      .leftJoinAndSelect('recurringDonation.project', 'project')
      .leftJoinAndSelect('recurringDonation.donor', 'donor')
      .getOne();
  };

export const getPendingRecurringDonationsIds = (): Promise<
  { id: number }[]
> => {
  const date = moment()
    .subtract({
      hours:
        Number(process.env.RECURRING_DONATION_VERIFICAITON_EXPIRATION_HOURS) ||
        72,
    })
    .toDate();
  logger.debug('getPendingRecurringDonationsIds  -> expirationDate', date);
  return RecurringDonation.find({
    where: {
      status: RECURRING_DONATION_STATUS.PENDING,
      createdAt: MoreThan(date),
    },
    select: ['id'],
  });
};
