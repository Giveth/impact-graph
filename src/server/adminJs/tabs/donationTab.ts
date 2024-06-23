import { SelectQueryBuilder } from 'typeorm';
import { ActionContext } from 'adminjs';
import {
  Donation,
  DONATION_STATUS,
  DONATION_TYPES,
} from '../../../entities/donation';
import {
  canAccessDonationAction,
  ResourceActions,
} from '../adminJsPermissions';
import {
  AdminJsContextInterface,
  AdminJsRequestInterface,
  AdminJsDonationsQuery,
  donationHeaders,
} from '../adminJs-types';
import { messages } from '../../../utils/messages';
import { logger } from '../../../utils/logger';
import {
  findEvmTransactionByHash,
  getCsvAirdropTransactions,
  getGnosisSafeTransactions,
} from '../../../services/chains/evm/transactionService';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages';
import { Project } from '../../../entities/project';
import { calculateGivbackFactor } from '../../../services/givbackService';
import { findUserByWalletAddress } from '../../../repositories/userRepository';
import { updateTotalDonationsOfProject } from '../../../services/donationService';
import { updateUserTotalDonated } from '../../../services/userService';
import { NETWORK_IDS } from '../../../provider';
import {
  initExportSpreadsheet,
  addDonationsSheetToSpreadsheet,
} from '../../../services/googleSheets';
import { extractAdminJsReferrerUrlParams } from '../adminJs';
import { getTwitterDonations } from '../../../services/Idriss/contractDonations';
import {
  NetworkTransactionInfo,
  TransactionDetailInput,
} from '../../../services/chains';

export const createDonation = async (
  request: AdminJsRequestInterface,
  response,
) => {
  let message = messages.DONATION_CREATED_SUCCESSFULLY;
  const donations: Donation[] = [];

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
      const txInfo = await findEvmTransactionByHash({
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
          'Creating donation by adminJs, csv airdrop error ' +
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
      donations.push(donation);

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

  return {
    record: donations,
  };
};

// add queries depending on which filters were selected
export const buildDonationsQuery = (
  queryStrings: AdminJsDonationsQuery,
): SelectQueryBuilder<Donation> => {
  const query = Donation.createQueryBuilder('donation')
    .leftJoinAndSelect('donation.user', 'user')
    .leftJoinAndSelect('donation.project', 'project')
    .leftJoinAndSelect('donation.qfRound', 'qfRound')
    .where('donation.amount > 0')
    .addOrderBy('donation.createdAt', 'DESC');

  if (queryStrings.id)
    query.andWhere('donation.id = :id', {
      id: queryStrings.id,
    });

  if (queryStrings.projectId)
    query.andWhere('donation.projectId = :projectId', {
      projectId: queryStrings.projectId,
    });

  if (queryStrings.qfRoundId)
    query.andWhere('donation.qfRoundId = :qfRoundId', {
      qfRoundId: queryStrings.qfRoundId,
    });

  if (queryStrings.userId)
    query.andWhere('donation.userId = :userId', {
      userId: queryStrings.userId,
    });

  if (queryStrings.currency)
    query.andWhere('donation.currency ILIKE :currency', {
      currency: `%${queryStrings.currency}%`,
    });

  if (queryStrings.status)
    query.andWhere('donation.status ILIKE :status', {
      status: `%${queryStrings.status}%`,
    });

  if (queryStrings.transactionNetworkId)
    query.andWhere('donation.transactionNetworkId = :transactionNetworkId', {
      transactionNetworkId: Number(queryStrings.transactionNetworkId),
    });

  if (queryStrings.fromWalletAddress)
    query.andWhere('donation.fromWalletAddress ILIKE :fromWalletAddress', {
      fromWalletAddress: `%${queryStrings.fromWalletAddress}%`,
    });

  if (queryStrings.toWalletAddress)
    query.andWhere('donation.toWalletAddress ILIKE :toWalletAddress', {
      toWalletAddress: `%${queryStrings.toWalletAddress}%`,
    });

  if (queryStrings.contactEmail)
    query.andWhere('donation.contactEmail ILIKE :contactEmail', {
      contactEmail: `%${queryStrings.contactEmail}%`,
    });

  if (queryStrings.referrerWallet)
    query.andWhere('donation.referrerWallet = :referrerWallet', {
      referrerWallet: `%${queryStrings.referrerWallet}%`,
    });

  if (queryStrings.isProjectVerified)
    query.andWhere('donation.isProjectVerified = :isProjectVerified', {
      isProjectVerified: queryStrings.isProjectVerified === 'true',
    });

  if (queryStrings['createdAt~~from'])
    query.andWhere('donation."createdAt" >= :createdFrom', {
      createdAt: queryStrings['createdAt~~from'],
    });

  if (queryStrings['createdAt~~to'])
    query.andWhere('donation."createdAt" <= :createdTo', {
      createdAt: queryStrings['createdAt~~to'],
    });

  return query;
};

export const importDonationsFromIdrissTwitter = async (
  _request: ActionContext,
  _response,
  context: AdminJsContextInterface,
) => {
  const { records } = context;

  try {
    await getTwitterDonations();
    return {
      redirectUrl: '/admin/resources/Donation',
      records,
      notice: {
        message: `Donation(s) successfully exported`,
        type: 'success',
      },
    };
  } catch (e) {
    return {
      redirectUrl: '/admin/resources/Donation',
      record: {},
      notice: {
        message: e.message,
        type: 'danger',
      },
    };
  }
};

export const exportDonationsWithFiltersToCsv = async (
  _request: ActionContext,
  _response,
  context: AdminJsContextInterface,
) => {
  try {
    const { records } = context;
    const queryStrings = extractAdminJsReferrerUrlParams(_request);
    const projectsQuery = buildDonationsQuery(queryStrings);
    const projects = await projectsQuery.getMany();

    await sendDonationsToGoogleSheet(projects);

    return {
      redirectUrl: '/admin/resources/Donation',
      records,
      notice: {
        message: `Donation(s) successfully exported`,
        type: 'success',
      },
    };
  } catch (e) {
    return {
      redirectUrl: '/admin/resources/Donation',
      record: {},
      notice: {
        message: e.message,
        type: 'danger',
      },
    };
  }
};

// Spreadsheet filters included
const sendDonationsToGoogleSheet = async (
  donations: Donation[],
): Promise<void> => {
  const spreadsheet = await initExportSpreadsheet();

  // parse data and set headers
  const donationRows = donations.map((donation: Donation) => {
    return {
      id: donation.id,
      transactionId: donation.transactionId,
      transactionNetworkId: donation.transactionNetworkId,
      isProjectVerified: Boolean(donation.isProjectVerified),
      status: donation.status,
      toWalletAddress: donation.toWalletAddress,
      fromWalletAddress: donation.fromWalletAddress,
      tokenAddress: donation.tokenAddress || '',
      currency: donation.currency,
      anonymous: Boolean(donation.anonymous),
      amount: donation.amount,
      isFiat: Boolean(donation.isFiat),
      isCustomToken: Boolean(donation.isCustomToken),
      valueEth: donation.valueEth,
      valueUsd: donation.valueUsd,
      priceEth: donation.priceEth,
      priceUsd: donation.priceUsd,
      projectId: donation?.project?.id || '',
      userId: donation?.user?.id || '',
      contactEmail: donation?.contactEmail || '',
      createdAt: donation?.createdAt.toISOString(),
      referrerWallet: donation?.referrerWallet || '',
      isTokenEligibleForGivback: Boolean(donation?.isTokenEligibleForGivback),
      qfRoundId: donation?.qfRound?.id || '',
      qfRoundUserScore: donation?.qfRoundUserScore || '',
    };
  });

  await addDonationsSheetToSpreadsheet(
    spreadsheet,
    donationHeaders,
    donationRows,
  );
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
      qfRoundId: {
        type: Number,
        isVisible: {
          list: false,
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
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },

      onramperId: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      qfRoundUserScore: {
        isVisible: {
          list: false,
          filter: false,
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
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      verifyErrorMessage: {
        isVisible: {
          list: false,
          filter: false,
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
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },
      transakTransactionLink: {
        isVisible: false,
      },
      anonymous: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
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
          list: false,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      amount: {
        isVisible: {
          list: false,
          filter: false,
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
          list: false,
          filter: false,
          show: true,
          edit: true,
          new: false,
        },
      },
      isProjectVerified: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
          new: false,
        },
      },
      status: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: false,
        },
        availableValues: [
          { value: DONATION_STATUS.VERIFIED, label: DONATION_STATUS.VERIFIED },
          { value: DONATION_STATUS.PENDING, label: DONATION_STATUS.PENDING },
          { value: DONATION_STATUS.FAILED, label: DONATION_STATUS.FAILED },
        ],
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
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      transactionNetworkId: {
        availableValues: [
          { value: NETWORK_IDS.MAIN_NET, label: 'Mainnet' },
          { value: NETWORK_IDS.XDAI, label: 'Xdai' },
          { value: NETWORK_IDS.GOERLI, label: 'Goerli' },
          { value: NETWORK_IDS.POLYGON, label: 'Polygon' },
          { value: NETWORK_IDS.CELO, label: 'Celo' },
          { value: NETWORK_IDS.CELO_ALFAJORES, label: 'Alfajores' },
          { value: NETWORK_IDS.ARBITRUM_MAINNET, label: 'Arbitrum' },
          { value: NETWORK_IDS.ARBITRUM_SEPOLIA, label: 'Arbitrum Sepolia' },
          { value: NETWORK_IDS.BASE_MAINNET, label: 'Base' },
          { value: NETWORK_IDS.BASE_SEPOLIA, label: 'Base Sepolia' },
          { value: NETWORK_IDS.ZKEVM_MAINNET, label: 'ZKEVM Mainnet' },
          { value: NETWORK_IDS.ZKEVM_CARDONA, label: 'ZKEVM Cardona' },
        ],
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      txType: {
        availableValues: [
          { value: 'normalTransfer', label: 'normalTransfer' },
          { value: 'csvAirDrop', label: 'Using csv airdrop app' },
          { value: 'gnosisSafe', label: 'Using gnosis safe multi sig' },
        ],
        isVisible: {
          filter: false,
          list: false,
          show: false,
          new: true,
          edit: false,
        },
      },
      priceUsd: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
          new: false,
        },
        type: 'number',
      },
      transactionId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      isReferrerGivbackEligible: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      segmentNotified: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      referralStartTimestamp: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessDonationAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessDonationAction({ currentAdmin }, ResourceActions.SHOW),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessDonationAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
      edit: {
        isVisible: true,
        before: async (request: AdminJsRequestInterface) => {
          const availableFieldsForEdit = [
            'isProjectVerified',
            'status',
            'valueUsd',
            'priceUsd',
          ];
          Object.keys(request?.payload).forEach(key => {
            if (!availableFieldsForEdit.includes(key)) {
              delete request?.payload[key];
            }
          });
          logger.debug('request?.payload', {
            payload: request?.payload,
          });

          return request;
        },
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
      exportFilterToCsv: {
        actionType: 'resource',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessDonationAction(
            { currentAdmin },
            ResourceActions.EXPORT_FILTER_TO_CSV,
          ),
        handler: exportDonationsWithFiltersToCsv,
        component: false,
      },
      importIdrissDonations: {
        actionType: 'resource',
        isVisible: true,
        isAccessible: true,
        handler: importDonationsFromIdrissTwitter,
        component: false,
      },
    },
  },
};
