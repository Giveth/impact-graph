import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';

import { QfRoundHistory } from '../entities/qfRoundHistory';
import { getQfRoundHistory } from '../repositories/qfRoundHistoryRepository';
import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { findProjectById } from '../repositories/projectRepository';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import {
  addNewAnchorAddress,
  findActiveAnchorAddress,
} from '../repositories/anchorContractAddressRepository';
import { ApolloContext } from '../types/ApolloContext';
import { findUserById } from '../repositories/userRepository';
import { Donation } from '../entities/donation';
import { RecurringDonation } from '../entities/recurringDonation';
import { createNewRecurringDonation } from '../repositories/recurringDonationRepository';

@Resolver(of => AnchorContractAddress)
export class RecurringDonationResolver {
  @Mutation(returns => RecurringDonation, { nullable: true })
  async createRecurringDonation(
    @Ctx() ctx: ApolloContext,
    @Arg('projectId', () => Int) projectId: number,
    @Arg('networkId', () => Int) networkId: number,
    @Arg('txHash', () => String) txHash: string,
  ): Promise<RecurringDonation> {
    const userId = ctx?.req?.user?.userId;
    const donor = await findUserById(userId);
    if (!donor) {
      throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
    }
    const project = await findProjectById(projectId);
    if (!project) {
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    }
    const currentAnchorProjectAddress = await findActiveAnchorAddress({
      projectId,
      networkId,
    });

    if (!currentAnchorProjectAddress) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.THERE_IS_AN_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT_ONLY_ADMIN_CAN_CHANGE_IT,
        ),
      );
    }

    return createNewRecurringDonation({
      donor,
      project,
      anchorContractAddress: currentAnchorProjectAddress,
      networkId,
      txHash,
    });
  }
}
