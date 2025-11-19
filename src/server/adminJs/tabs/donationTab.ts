import { ActionContext } from 'adminjs';
import moment from 'moment';
import { ILike, SelectQueryBuilder } from 'typeorm';
import { CoingeckoPriceAdapter } from '../../../adapters/price/CoingeckoPriceAdapter';
import {
  Donation,
  DONATION_STATUS,
  DONATION_TYPES,
} from '../../../entities/donation';
import { Project } from '../../../entities/project';
import { Token } from '../../../entities/token';
import { NETWORK_IDS } from '../../../provider';
import { findQfRoundById } from '../../../repositories/qfRoundRepository';
import { findUserByWalletAddress } from '../../../repositories/userRepository';
import { getTwitterDonations } from '../../../services/Idriss/contractDonations';
import {
  getTransactionInfoFromNetwork,
  NetworkTransactionInfo,
  TransactionDetailInput,
} from '../../../services/chains';
import {
  findEvmTransactionByHash,
  getCsvAirdropTransactions,
  getGnosisSafeTransactions,
} from '../../../services/chains/evm/transactionService';
import { isTokenAcceptableForProject } from '../../../services/donationService';
import { calculateGivbackFactor } from '../../../services/givbackService';
import {
  addDonationsSheetToSpreadsheet,
  initExportSpreadsheet,
} from '../../../services/googleSheets';
import { updateProjectStatistics } from '../../../services/projectService';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../../../services/userService';
import { ChainType } from '../../../types/network';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages';
import { logger } from '../../../utils/logger';
import { messages } from '../../../utils/messages';
import { extractAdminJsReferrerUrlParams } from '../adminJs';
import {
  AdminJsContextInterface,
  AdminJsDonationsQuery,
  AdminJsRequestInterface,
  donationHeaders,
} from '../adminJs-types';
import {
  canAccessDonationAction,
  canAccessQfRoundHistoryAction,
  ResourceActions,
} from '../adminJsPermissions';

export const createDonation = async (request: AdminJsRequestInterface) => {
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
      segmentNotified,
      qfRoundId,
      anonymous,
      chainType,
      fromWalletAddress,
      toWalletAddress,
      amount,
      timestamp,
      toWalletMemo,
    } = request?.payload || {};

    // Validate required fields
    if (
      !txHash ||
      !transactionNetworkId ||
      !currency ||
      !priceUsd ||
      !chainType
    ) {
      const errors: Record<string, { message: string }> = {};
      if (!txHash) errors.transactionId = { message: 'txHash is required' };
      if (!transactionNetworkId)
        errors.transactionNetworkId = {
          message: 'transactionNetworkId is required',
        };
      if (!currency) errors.currency = { message: 'currency is required' };
      if (!priceUsd) errors.priceUsd = { message: 'priceUsd is required' };
      if (!chainType) errors.chainType = { message: 'chainType is required' };
      return {
        record: {
          params: request?.payload || {},
          errors,
        },
        notice: {
          message: 'Please fix the highlighted fields',
          type: 'danger',
        },
      };
    }

    // Validate required fields for non-EVM chains
    if (chainType !== ChainType.EVM) {
      const errors: Record<string, { message: string }> = {};
      if (!fromWalletAddress)
        errors.fromWalletAddress = {
          message: 'fromWalletAddress is required for non-EVM chains',
        };
      if (!toWalletAddress)
        errors.toWalletAddress = {
          message: 'toWalletAddress is required for non-EVM chains',
        };
      if (!amount)
        errors.amount = { message: 'amount is required for non-EVM chains' };
      if (!timestamp)
        errors.timestamp = {
          message: 'timestamp is required for non-EVM chains',
        };

      if (Object.keys(errors).length > 0) {
        return {
          record: {
            params: request?.payload || {},
            errors,
          },
          notice: {
            message: 'Please fix the highlighted fields for non-EVM donation',
            type: 'danger',
          },
        };
      }
    }

    const networkId = Number(transactionNetworkId);
    let transactions: NetworkTransactionInfo[] = [];
    let donationType;

    const existingTx = await Donation.findOne({
      where: {
        transactionNetworkId: networkId,
        transactionId: ILike(txHash),
      },
    });
    if (existingTx) {
      return {
        record: {
          params: request?.payload || {},
          errors: {
            transactionId: { message: 'Transaction already exists' },
          },
        },
        notice: {
          message: 'Transaction already exists',
          type: 'danger',
        },
      };
    }

    // Handle different transaction types
    if (txType === 'csvAirDrop') {
      transactions = await getCsvAirdropTransactions(txHash, networkId);
      donationType = DONATION_TYPES.CSV_AIR_DROP;
    } else if (txType === 'gnosisSafe') {
      transactions = await getGnosisSafeTransactions(txHash, networkId);
      donationType = DONATION_TYPES.GNOSIS_SAFE;
    } else {
      // Handle both EVM and non-EVM transactions
      if (chainType === ChainType.EVM) {
        const txInfo = await findEvmTransactionByHash({
          networkId,
          txHash,
          symbol: currency,
        } as TransactionDetailInput);
        if (!txInfo) {
          return {
            record: {
              params: request?.payload || {},
              errors: {
                transactionId: {
                  message: 'Transaction not found on blockchain',
                },
              },
            },
            notice: {
              message: 'Transaction not found on blockchain',
              type: 'danger',
            },
          };
        }
        transactions.push(txInfo);
      } else {
        // Non-EVM chain - validate transaction using appropriate service
        try {
          const txInfo = await getTransactionInfoFromNetwork({
            txHash,
            symbol: currency,
            networkId,
            fromAddress: fromWalletAddress,
            toAddress: toWalletAddress,
            amount: Number(amount),
            timestamp: Number(timestamp),
            chainType,
          } as TransactionDetailInput);
          transactions.push(txInfo);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            record: {
              params: request?.payload || {},
              errors: {
                transactionId: {
                  message: `Transaction validation failed: ${errorMessage}`,
                },
              },
            },
            notice: {
              message: `Transaction validation failed: ${errorMessage}`,
              type: 'danger',
            },
          };
        }
      }
    }

    // Validate QF Round if provided
    let qfRound: any = null;
    if (qfRoundId) {
      qfRound = await findQfRoundById(Number(qfRoundId));
      if (!qfRound) {
        return {
          record: {
            params: request?.payload || {},
            errors: {
              qfRoundId: { message: 'QF Round not found' },
            },
          },
          notice: {
            message: 'QF Round not found',
            type: 'danger',
          },
        };
      }
    }

    for (const transactionInfo of transactions) {
      const projectQuery = Project.createQueryBuilder('project')
        .innerJoin('project.addresses', 'projectAddress')
        .leftJoinAndSelect('project.organization', 'organization')
        .leftJoinAndSelect('project.qfRounds', 'qfRounds')
        .where('projectAddress."isRecipient" = true')
        .andWhere('projectAddress."networkId" = :networkId', { networkId });

      switch (chainType) {
        case ChainType.SOLANA:
          projectQuery.andWhere('projectAddress.address = :address', {
            address: transactionInfo?.to,
          });
          break;
        case ChainType.STELLAR:
          projectQuery.andWhere(
            'UPPER(projectAddress.address) = UPPER(:address)',
            {
              address: transactionInfo?.to,
            },
          );
          if (toWalletMemo) {
            projectQuery.andWhere('projectAddress.memo = :memo', {
              memo: toWalletMemo,
            });
          } else {
            projectQuery.andWhere('projectAddress.memo IS NULL');
          }
          break;
        default:
          projectQuery.andWhere(
            'LOWER(projectAddress.address) = LOWER(:address)',
            {
              address: transactionInfo?.to,
            },
          );
      }

      const project = await projectQuery.getOne();

      if (!project) {
        if (transactions.length === 1) {
          return {
            record: {
              params: request?.payload || {},
              errors: {
                toWalletAddress: {
                  message: 'Project not found',
                },
              },
            },
            notice: {
              message: 'Project not found',
              type: 'danger',
            },
          };
        }
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

      // Validate QF Round conditions
      if (qfRound) {
        // a) Check if project is part of the QF round
        const isProjectInQfRound = project.qfRounds?.some(
          qr => qr.id === qfRound!.id,
        );
        if (!isProjectInQfRound) {
          return {
            record: {
              params: request?.payload || {},
              errors: {
                qfRoundId: {
                  message: 'Project is not part of this QF round',
                },
              },
            },
            notice: {
              message: 'Project is not part of this QF round',
              type: 'danger',
            },
          };
        }

        // b) Check if donation is on QF round eligible network
        if (!qfRound.isEligibleNetwork(networkId)) {
          return {
            record: {
              params: request?.payload || {},
              errors: {
                transactionNetworkId: {
                  message: `Network ${networkId} is not eligible for this QF round. Eligible networks: ${qfRound.eligibleNetworks.join(', ') || 'all networks'}`,
                },
              },
            },
            notice: {
              message: `Network ${networkId} is not eligible for this QF round`,
              type: 'danger',
            },
          };
        }

        // c) Check if donation timestamp is between QF start and end date
        const donationDate = new Date(transactionInfo?.timestamp * 1000);
        if (
          donationDate < qfRound.beginDate ||
          donationDate > qfRound.endDate
        ) {
          return {
            record: {
              params: request?.payload || {},
              errors: {
                timestamp: {
                  message: `Donation timestamp (${donationDate.toISOString()}) is not within QF round period (${qfRound.beginDate.toISOString()} - ${qfRound.endDate.toISOString()})`,
                },
              },
            },
            notice: {
              message: 'Donation timestamp is not within QF round period',
              type: 'danger',
            },
          };
        }
      }

      // 2. Check if donor is donating to their own project
      const donor = await findUserByWalletAddress(transactionInfo?.from);
      if (donor && project.adminUserId === donor.id) {
        return {
          record: {
            params: request?.payload || {},
            errors: {
              fromWalletAddress: {
                message: "Donor can't donate to his/her own project",
              },
            },
          },
          notice: {
            message: "Donor can't donate to his/her own project",
            type: 'danger',
          },
        };
      }

      const tokenInDb = await Token.findOne({
        where: {
          networkId,
          symbol: transactionInfo?.currency,
        },
      });
      const isCustomToken = !tokenInDb;
      let isTokenEligibleForGivback = false;
      if (isCustomToken && !project.organization.supportCustomTokens) {
        return {
          record: {
            params: request?.payload || {},
            errors: {
              currency: {
                message:
                  'Token not found on DB and project organization does not support custom tokens',
              },
            },
          },
          notice: {
            message:
              'Token not found on DB and project organization does not support custom tokens',
            type: 'danger',
          },
        };
      } else if (tokenInDb) {
        const acceptsToken = await isTokenAcceptableForProject({
          projectId: project.id,
          tokenId: tokenInDb.id,
        });
        if (!acceptsToken && !project.organization.supportCustomTokens) {
          return {
            record: {
              params: request?.payload || {},
              errors: {
                currency: {
                  message:
                    'Token not acceptable for project and project organization does not support custom tokens',
                },
              },
            },
            notice: {
              message:
                'Token not acceptable for project and project organization does not support custom tokens',
              type: 'danger',
            },
          };
        }
        isTokenEligibleForGivback = tokenInDb.isGivbackEligible;
      }

      const { givbackFactor, projectRank, bottomRankInRound, powerRound } =
        await calculateGivbackFactor(project.id);
      const donation = Donation.create({
        givbackFactor,
        projectRank,
        bottomRankInRound,
        powerRound,
        chainType,
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
        isProjectGivbackEligible: project.isGivbackEligible,
        donationType,
        createdAt: new Date(transactionInfo?.timestamp * 1000),
        anonymous,
        isTokenEligibleForGivback,
        qfRoundId: qfRoundId ? Number(qfRoundId) : undefined,
        toWalletMemo: toWalletMemo || undefined,
      });
      if (donor) {
        donation.anonymous = false;
        donation.user = donor;
      }
      await donation.save();
      await updateProjectStatistics(project.id, donation?.qfRoundId);
      await updateUserTotalReceived(project.adminUserId);
      if (donor) {
        await updateUserTotalDonated(donor.id);
      }
      donations.push(donation);
      message = `Donation has been created successfully, ID: ${donation.id}`;
      logger.debug('Donation has been created successfully', donation.id);
    }
  } catch (e) {
    message = e.message || JSON.stringify(e);
    type = 'danger';
    logger.error('create donation error', e.message);
  }

  if (type === 'success') {
    return {
      redirectUrl: '/admin/resources/Donation',
      record: {},
      notice: {
        message,
        type,
      },
    };
  }

  return {
    record: {
      params: (request as any)?.payload || {},
    },
    notice: {
      message,
      type,
    },
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

  if (queryStrings.isProjectGivbackEligible)
    query.andWhere(
      'donation.isProjectGivbackEligible = :isProjectGivbackEligible',
      {
        isProjectGivbackEligible:
          queryStrings.isProjectGivbackEligible === 'true',
      },
    );

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

export const FillPricesForDonationsWithoutPrice = async () => {
  const donationsWithoutPrice = await Donation.createQueryBuilder('donation')
    .where('donation.valueUsd IS NULL')
    .andWhere('donation.status = :status', { status: DONATION_STATUS.VERIFIED })
    .orderBy({ 'donation.createdAt': 'DESC' })
    .getMany();
  const coingeckoAdapter = new CoingeckoPriceAdapter();
  const filledPrices: { donationId: number; price: number }[] = [];
  logger.debug(
    'FillPricesForDonationsWithoutPrice donation ids',
    donationsWithoutPrice.map(d => d.id),
  );
  for (const donation of donationsWithoutPrice) {
    try {
      const token = await Token.findOneBy({ symbol: donation.currency });
      if (!token || !token.coingeckoId) continue;
      const price = await coingeckoAdapter.getTokenPriceAtDate({
        date: moment(donation.createdAt).format('DD-MM-YYYY'),
        symbol: token.coingeckoId,
      });
      donation.valueUsd = donation.amount * price;
      donation.priceUsd = price;
      filledPrices.push({ donationId: donation.id, price });
      await donation.save();
      await updateProjectStatistics(donation.projectId);
      await updateUserTotalDonated(donation.userId);
      const owner = await findUserByWalletAddress(donation.toWalletAddress);
      if (owner?.id) await updateUserTotalReceived(owner.id);
    } catch {
      logger.debug(
        'FillPricesForDonationsWithoutPrice filled prices',
        filledPrices,
      );
      return {
        redirectUrl: '/admin/resources/Donation',
        record: {},
        notice: {
          message: `${donationsWithoutPrice.length} donations without price found. ${filledPrices.length} prices filled`,
          type: 'success',
        },
      };
    }
  }
  logger.debug(
    'FillPricesForDonationsWithoutPrice filled prices',
    filledPrices,
  );
  return {
    redirectUrl: '/admin/resources/Donation',
    record: {},
    notice: {
      message: `${donationsWithoutPrice.length} donations without price found. ${filledPrices.length} prices filled`,
      type: 'success',
    },
  };
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
    logger.error('importDonationsFromIdrissTwitter() error', e);
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
    logger.error('exportDonationsWithFiltersToCsv() error', e);
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
      isProjectGivbackEligible: Boolean(donation.isProjectGivbackEligible),
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
          new: true,
        },
      },
      qfRoundId: {
        type: Number,
        reference: 'QfRound',
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: true,
          new: true,
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
          show: false,
          edit: false,
          new: false,
        },
      },

      onramperTransactionStatus: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },

      onramperId: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
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
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },
      verifyErrorMessage: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
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
          edit: true,
          new: true,
        },
      },
      userId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: true,
        },
      },
      tokenAddress: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
          new: true,
        },
      },
      fromWalletAddress: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: true,
        },
      },
      toWalletAddress: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: false,
          new: true,
        },
      },
      amount: {
        type: 'number',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
          new: true,
        },
        description: 'Required for non-EVM chains only',
      },
      distributedFundQfRoundId: {
        isVisible: false,
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
          edit: false,
          new: false,
        },
      },
      isProjectGivbackEligible: {
        isVisible: {
          list: false,
          filter: false,
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
        availableValues: [
          { value: DONATION_STATUS.VERIFIED, label: DONATION_STATUS.VERIFIED },
          { value: DONATION_STATUS.PENDING, label: DONATION_STATUS.PENDING },
          { value: DONATION_STATUS.FAILED, label: DONATION_STATUS.FAILED },
          {
            value: DONATION_STATUS.SWAP_PENDING,
            label: DONATION_STATUS.SWAP_PENDING,
          },
        ],
      },
      createdAt: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: true,
        },
      },
      currency: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      transactionNetworkId: {
        availableValues: [
          { value: NETWORK_IDS.MAIN_NET, label: 'Mainnet' },
          { value: NETWORK_IDS.XDAI, label: 'Xdai' },
          { value: NETWORK_IDS.SEPOLIA, label: 'Sepolia' },
          { value: NETWORK_IDS.POLYGON, label: 'Polygon' },
          { value: NETWORK_IDS.CELO, label: 'Celo' },
          { value: NETWORK_IDS.CELO_ALFAJORES, label: 'Alfajores' },
          { value: NETWORK_IDS.ARBITRUM_MAINNET, label: 'Arbitrum' },
          { value: NETWORK_IDS.ARBITRUM_SEPOLIA, label: 'Arbitrum Sepolia' },
          { value: NETWORK_IDS.BASE_MAINNET, label: 'Base' },
          { value: NETWORK_IDS.BASE_SEPOLIA, label: 'Base Sepolia' },
          { value: NETWORK_IDS.ZKEVM_MAINNET, label: 'ZKEVM Mainnet' },
          { value: NETWORK_IDS.ZKEVM_CARDONA, label: 'ZKEVM Cardona' },
          { value: NETWORK_IDS.OPTIMISTIC, label: 'Optimistic' },
          { value: NETWORK_IDS.OPTIMISM_SEPOLIA, label: 'Optimism Sepolia' },
          { value: NETWORK_IDS.STELLAR_MAINNET, label: 'Stellar Mainnet' },
          { value: NETWORK_IDS.SOLANA_MAINNET, label: 'Solana Mainnet' },
          { value: NETWORK_IDS.SOLANA_TESTNET, label: 'Solana Testnet' },
          { value: NETWORK_IDS.SOLANA_DEVNET, label: 'Solana Devnet' },
          { value: NETWORK_IDS.CARDANO_MAINNET, label: 'Cardano Mainnet' },
          { value: NETWORK_IDS.CARDANO_PREPROD, label: 'Cardano Preprod' },
        ],
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
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
      isSwap: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
        },
      },
      swapTransactionId: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
        },
      },
      qfRoundErrorMessage: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
        },
      },
      swapTransaction: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
        },
      },
      priceUsd: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
          new: true,
        },
        type: 'number',
      },
      chainType: {
        availableValues: [
          { value: ChainType.EVM, label: 'EVM' },
          { value: ChainType.SOLANA, label: 'Solana' },
          { value: ChainType.STELLAR, label: 'Stellar' },
          { value: ChainType.CARDANO, label: 'Cardano' },
        ],
        isVisible: {
          filter: false,
          list: true,
          show: true,
          new: true,
          edit: true,
        },
      },
      timestamp: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: true,
          new: true,
        },
        type: 'number',
        description:
          'Unix timestamp (seconds) - Required for non-EVM chains only',
      },
      toWalletMemo: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
          new: true,
        },
        description: 'Optional memo for Stellar transactions',
      },
      transactionId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
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
          show: false,
          edit: false,
          new: false,
        },
      },
      // Fields removed from create form
      blockNumber: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },
      origin: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },
      recurringDonationId: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },
      virtualPeriodStart: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },
      fromTokenAmount: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      virtualPeriodEnd: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },
      relevantDonationTxHash: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },
      importDate: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
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
            'isProjectGivbackEligible',
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
      FillPricesForDonationsWithoutPrice: {
        actionType: 'resource',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.FILL_PRICES_FOR_DONATIONS_WITHOUT_PRICE,
          ),
        handler: FillPricesForDonationsWithoutPrice,
        component: false,
      },
    },
  },
};
