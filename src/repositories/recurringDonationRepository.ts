import { Project } from '../entities/project';
import { User } from '../entities/user';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../entities/recurringDonation';
import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { Donation } from '../entities/donation';
import { logger } from '../utils/logger';

export const createNewRecurringDonation = async (params: {
  project: Project;
  donor: User;
  anchorContractAddress: AnchorContractAddress;
  networkId: number;
  txHash: string;
  flowRate: string;
  currency: string;
  anonymous: boolean;
}): Promise<RecurringDonation> => {
  const recurringDonation = await RecurringDonation.create({
    project: params.project,
    donor: params.donor,
    anchorContractAddress: params.anchorContractAddress,
    networkId: params.networkId,
    txHash: params.txHash,
    currency: params.currency,
    flowRate: params.flowRate,
    anonymous: params.anonymous,
  });
  return recurringDonation.save();
};
export const updateRecurringDonation = async (params: {
  recurringDonation: RecurringDonation;
  txHash?: string;
  flowRate?: string;
  anonymous?: boolean;
  status?: string;
}): Promise<RecurringDonation> => {
  const { recurringDonation, txHash, anonymous, flowRate, status } = params;
  if (txHash && flowRate) {
    recurringDonation.txHash = txHash;
    recurringDonation.flowRate = flowRate;
  }

  if (anonymous) {
    recurringDonation.anonymous = anonymous;
  }

  if (
    recurringDonation.status === RECURRING_DONATION_STATUS.ACTIVE &&
    status === RECURRING_DONATION_STATUS.ENDED
  ) {
    recurringDonation.status = status;
  }

  if (
    recurringDonation.status === RECURRING_DONATION_STATUS.ENDED &&
    status === RECURRING_DONATION_STATUS.ARCHIVED
  ) {
    recurringDonation.status = status;
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
        WHERE d.recurringDonationId = $1
      ),
      "amountStreamed" = (
        SELECT COALESCE(SUM(d."amount"), 0)
        FROM donation as d
        WHERE d.recurringDonationId = $1
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
    .where(`recurringDonation.id = :id`, { id })
    .getOne();
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
      .getOne();
  };
