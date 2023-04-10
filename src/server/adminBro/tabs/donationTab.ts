import {
  Donation,
  DONATION_STATUS,
  DONATION_TYPES,
} from '../../../entities/donation';
import {
  canAccessDonationAction,
  ResourceActions,
} from '../adminBroPermissions';
import {
  AdminBroContextInterface,
  AdminBroRequestInterface,
} from '../adminBro-types';
import { messages } from '../../../utils/messages';
import { logger } from '../../../utils/logger';
import {
  NetworkTransactionInfo,
  TransactionDetailInput,
} from '../../../types/TransactionInquiry';
import {
  findTransactionByHash,
  getCsvAirdropTransactions,
  getGnosisSafeTransactions,
} from '../../../services/transactionService';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages';
import { Project } from '../../../entities/project';
import { calculateGivbackFactor } from '../../../services/givbackService';
import { findUserByWalletAddress } from '../../../repositories/userRepository';
import { updateTotalDonationsOfProject } from '../../../services/donationService';
import { updateUserTotalDonated } from '../../../services/userService';

export const createDonation = async (
  request: AdminBroRequestInterface,
  response,
  context: AdminBroContextInterface,
) => {
  let message = messages.DONATION_CREATED_SUCCESSFULLY;

  let type = 'success';
  try {
    logger.debug('create donation ', request.payload);
    const {
      transactionNetworkId,
      transactionId: txHash,
      currency,
      priceUsd,
      txType,
      isProjectVerified,
      segmentNotified,
    } = request.payload;
    if (!priceUsd) {
      throw new Error('priceUsd is required');
    }
    const networkId = Number(transactionNetworkId);
    let transactions: NetworkTransactionInfo[] = [];
    let donationType;

    if (txType === 'csvAirDrop') {
      // transactions = await getDisperseTransactions(txHash, networkId);
      transactions = await getCsvAirdropTransactions(txHash, networkId);
      donationType = DONATION_TYPES.CSV_AIR_DROP;
    } else if (txType === 'gnosisSafe') {
      // transactions = await getDisperseTransactions(txHash, networkId);
      transactions = await getGnosisSafeTransactions(txHash, networkId);
      donationType = DONATION_TYPES.GNOSIS_SAFE;
    } else {
      if (!currency) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.INVALID_TOKEN_SYMBOL),
        );
      }
      const txInfo = await findTransactionByHash({
        networkId,
        txHash,
        symbol: currency,
      } as TransactionDetailInput);
      if (!txInfo) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_TX_HASH));
      }
      transactions.push(txInfo);
    }

    for (const transactionInfo of transactions) {
      // const project = await Project.findOne({
      //   walletAddress: transactionInfo?.to,
      // });
      const project = await Project.createQueryBuilder('project')
        .where(`lower("walletAddress")=lower(:address)`, {
          address: transactionInfo?.to,
        })
        .getOne();

      if (!project) {
        logger.error(
          'Creating donation by admin bro, csv airdrop error ' +
            i18n.__(
              translationErrorMessagesKeys.TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS,
            ),
          {
            hash: txHash,
            toAddress: transactionInfo?.to,
            networkId,
          },
        );
        continue;
      }

      const { givbackFactor, projectRank, bottomRankInRound, powerRound } =
        await calculateGivbackFactor(project.id);
      const donation = Donation.create({
        givbackFactor,
        projectRank,
        bottomRankInRound,
        powerRound,
        fromWalletAddress: transactionInfo?.from,
        toWalletAddress: transactionInfo?.to,
        transactionId: txHash,
        transactionNetworkId: networkId,
        project,
        priceUsd,
        currency: transactionInfo?.currency,
        segmentNotified,
        amount: transactionInfo?.amount,
        valueUsd: (transactionInfo?.amount as number) * priceUsd,
        status: DONATION_STATUS.VERIFIED,
        isProjectVerified,
        donationType,
        createdAt: new Date(transactionInfo?.timestamp * 1000),
        anonymous: true,
        isTokenEligibleForGivback: true,
      });
      const donor = await findUserByWalletAddress(transactionInfo?.from);
      if (donor) {
        donation.anonymous = false;
        donation.user = donor;
      }
      await donation.save();
      await updateTotalDonationsOfProject(project.id);
      if (donor) {
        await updateUserTotalDonated(donor.id);
      }

      logger.debug('Donation has been created successfully', donation.id);
    }
  } catch (e) {
    message = e.message;
    type = 'danger';
    logger.error('create donation error', e.message);
  }

  response.send({
    redirectUrl: '/admin/resources/Donation',
    record: {},
    notice: {
      message,
      type,
    },
  });
};

export const donationTab = {
  resource: Donation,
  options: {
    properties: {
      projectId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      nonce: {
        isVisible: false,
      },

      isCustomToken: {
        isVisible: false,
      },

      contactEmail: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },

      onramperTransactionStatus: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },

      onramperId: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      givbackFactor: {
        isVisible: false,
      },
      projectRank: {
        isVisible: false,
      },
      bottomRankInRound: {
        isVisible: false,
      },
      powerRound: {
        isVisible: false,
      },
      referrerWallet: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      verifyErrorMessage: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      speedup: {
        isVisible: false,
      },
      isFiat: {
        isVisible: false,
      },
      donationType: {
        isVisible: false,
      },
      isTokenEligibleForGivback: {
        isVisible: false,
      },
      transakStatus: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      transakTransactionLink: {
        isVisible: false,
      },
      anonymous: {
        isVisible: false,
      },
      userId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      tokenAddress: {
        isVisible: false,
      },
      fromWalletAddress: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      toWalletAddress: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      amount: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      priceEth: {
        isVisible: false,
      },
      valueEth: {
        isVisible: false,
      },
      valueUsd: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      status: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      createdAt: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      currency: {
        isVisible: true,
      },
      transactionNetworkId: {
        availableValues: [
          { value: 1, label: 'Mainnet' },
          { value: 100, label: 'Xdai' },
          { value: 5, label: 'Goerli' },
        ],
        isVisible: true,
      },
      txType: {
        availableValues: [
          { value: 'normalTransfer', label: 'normalTransfer' },
          { value: 'csvAirDrop', label: 'Using csv airdrop app' },
          { value: 'gnosisSafe', label: 'Using gnosis safe multi sig' },
        ],
        isVisible: {
          list: false,
          show: false,
          new: true,
          edit: true,
        },
      },
      priceUsd: {
        isVisible: true,
        type: 'number',
      },
    },
    actions: {
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessDonationAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
      edit: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessDonationAction({ currentAdmin }, ResourceActions.EDIT),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessDonationAction({ currentAdmin }, ResourceActions.DELETE),
      },

      new: {
        handler: createDonation,
        isAccessible: ({ currentAdmin }) =>
          canAccessDonationAction({ currentAdmin }, ResourceActions.NEW),
      },
    },
  },
};
