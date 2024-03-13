import { Arg, Ctx, Int, Mutation, Resolver } from 'type-graphql';

import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { findProjectById } from '../repositories/projectRepository';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import {
  addNewAnchorAddress,
  findActiveAnchorAddress,
} from '../repositories/anchorContractAddressRepository';
import { ApolloContext } from '../types/ApolloContext';
import { findUserById } from '../repositories/userRepository';

@Resolver(_of => AnchorContractAddress)
export class AnchorContractAddressResolver {
  @Mutation(_returns => AnchorContractAddress, { nullable: true })
  async addAnchorContractAddress(
    @Ctx() ctx: ApolloContext,
    @Arg('projectId', () => Int) projectId: number,
    @Arg('networkId', () => Int) networkId: number,
    @Arg('address', () => String) address: string,
    @Arg('txHash', () => String) txHash: string,
  ): Promise<AnchorContractAddress> {
    const userId = ctx?.req?.user?.userId;
    const creatorUser = await findUserById(userId);
    if (!creatorUser) {
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

    if (currentAnchorProjectAddress) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.THERE_IS_AN_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT,
        ),
      );
    }
    if (
      !project.addresses?.find(
        projectAddress =>
          projectAddress.networkId === networkId &&
          projectAddress.isRecipient === true,
      )
    ) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_DOESNT_HAVE_RECIPIENT_ADDRESS_ON_THIS_NETWORK,
        ),
      );
    }

    // Validate anchor address, the owner of contract must be the project owner

    return addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: creatorUser,
      address,
      networkId,
      txHash,
    });
  }
}
