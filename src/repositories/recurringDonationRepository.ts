import { Project } from '../entities/project';
import { User } from '../entities/user';
import { RecurringDonation } from '../entities/recurringDonation';
import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { Donation } from '../entities/donation';
import { logger } from '../utils/logger';

export const createNewRecurringDonation = async (params: {
  project: Project;
  donor: User;
  anchorContractAddress: AnchorContractAddress;
  networkId: number;
  txHash: string;
  interval: string;
  amount: number;
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
    interval: params.interval,
    amount: params.amount,
    anonymous: params.anonymous,
  });
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
    .andWhere(`recurringDonation.finished = false`)
    .getOne();
};
