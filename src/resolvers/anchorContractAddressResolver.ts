import path from 'path';
import { promises as fs } from 'fs';
import { ethers } from 'ethers';
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
import { getProvider } from '../provider';
import { logger } from '../utils/logger';
import { ChainType } from '../types/network';
import { addBulkNewProjectAddress } from '../repositories/projectAddressRepository';
import { validateProjectRelatedAddresses } from '../utils/validators/projectValidator';

@Resolver(_of => AnchorContractAddress)
export class AnchorContractAddressResolver {
  @Mutation(_returns => AnchorContractAddress, { nullable: true })
  async addAnchorContractAddress(
    @Ctx() ctx: ApolloContext,
    @Arg('projectId', () => Int) projectId: number,
    @Arg('networkId', () => Int) networkId: number,
    @Arg('address', () => String) address: string,
    @Arg('txHash', () => String) txHash: string,
    @Arg('recipientAddress', { nullable: true }) recipientAddress?: string,
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
      if (recipientAddress) {
        const recipientAddressInput = {
          project,
          user: creatorUser,
          address: recipientAddress!,
          chainType: ChainType.EVM,
          networkId: networkId,
          isRecipient: true,
        };

        await validateProjectRelatedAddresses(
          [recipientAddressInput],
          projectId,
        );

        await addBulkNewProjectAddress([recipientAddressInput]);
      } else {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.PROJECT_DOESNT_HAVE_RECIPIENT_ADDRESS_ON_THIS_NETWORK,
          ),
        );
      }
    }

    const web3Provider = getProvider(networkId);
    // tx sample   // https://sepolia-optimism.etherscan.io/tx/0x7af6b35466b651a43dab0d06e066c421416e5b340c62e5a54124b3eac346297a
    const networkData = await web3Provider.getTransaction(txHash);

    if (!networkData) {
      logger.debug(
        'Transaction not found in the network. maybe its not mined yet',
        {
          txHash,
          networkId,
        },
      );
      throw new Error(i18n.__(translationErrorMessagesKeys.TX_NOT_FOUND));
    }

    // Load the ABI from  file
    const abiPath = path.join(__dirname, '../abi/anchorContractAbi.json');
    const abi = JSON.parse(await fs.readFile(abiPath, 'utf-8'));

    const iface = new ethers.utils.Interface(abi);
    const decodedData = iface.parseTransaction({ data: networkData.data });
    const profileOwnerWalletAddress = decodedData.args[3];
    if (
      profileOwnerWalletAddress.toLowerCase() !==
      project?.adminUser?.walletAddress?.toLowerCase()
    ) {
      logger.debug(
        'profile owner of tx payload does not match the project owner',
        {
          profileOwnerWalletAddress,
          projectOwner: project.adminUser.walletAddress,
        },
      );
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_ID));
    }

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
