import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';

import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { findProjectById } from '../repositories/projectRepository';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { findActiveAnchorAddress } from '../repositories/anchorContractAddressRepository';
import { ApolloContext } from '../types/ApolloContext';
import { findUserById } from '../repositories/userRepository';
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
          translationErrorMessagesKeys.THERE_IS_NOT_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT,
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
