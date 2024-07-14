import moment from 'moment/moment';
import {
  canAccessQfRoundHistoryAction,
  ResourceActions,
} from '../adminJsPermissions';

import { QfRoundHistory } from '../../../entities/qfRoundHistory';
import {
  AdminJsContextInterface,
  AdminJsRequestInterface,
} from '../adminJs-types';

import { fillQfRoundHistory } from '../../../repositories/qfRoundHistoryRepository';
import { insertDonationsFromQfRoundHistory } from '../../../services/donationService';
import { refreshProjectDonationSummaryView } from '../../../services/projectViewsService';
import { QfRound } from '../../../entities/qfRound';
import { Donation } from '../../../entities/donation';
import { CoingeckoPriceAdapter } from '../../../adapters/price/CoingeckoPriceAdapter';
import { Token } from '../../../entities/token';
import { logger } from '../../../utils/logger';

export const updateQfRoundHistory = async (
  _request: AdminJsRequestInterface,
  _response,
  _context: AdminJsContextInterface,
) => {
  await fillQfRoundHistory();
  return {
    redirectUrl: '/admin/resources/QfRoundHistory',
    record: {},
    notice: {
      message: `Qf round history has been updated for inActive ended rounds`,
      type: 'success',
    },
  };
};

export const CreateRelatedDonationsForQfRoundHistoryRecords = async (
  _request: AdminJsRequestInterface,
  _response,
  _context: AdminJsContextInterface,
) => {
  await insertDonationsFromQfRoundHistory();
  await refreshProjectDonationSummaryView();
  return {
    redirectUrl: '/admin/resources/QfRoundHistory',
    record: {},
    notice: {
      message: `Related donations for qfRoundHistory has been added`,
      type: 'success',
    },
  };
};

export const FillPricesForDonationsWithoutPriceInLatestRound = async (
  _request: AdminJsRequestInterface,
  _response,
  _context: AdminJsContextInterface,
) => {
  const latestRound = await QfRound.createQueryBuilder('qfRound')
    .select('qfRound.id')
    .orderBy({ 'qfRound.createdAt': 'DESC' })
    .getOne();
  if (!latestRound) return;
  const donationsWithoutPrice = await Donation.createQueryBuilder('donation')
    // .where('donation.qfRoundId = :qfRoundId', { qfRoundId: 105 })
    .andWhere('donation.valueUsd IS NULL')
    .orderBy({ 'donation.createdAt': 'DESC' })
    .getMany();
  const coingeckoAdapter = new CoingeckoPriceAdapter();
  const filledPrices: { donationId: number; price: number }[] = [];
  logger.debug(
    'FillPricesForDonationsWithoutPriceInLatestRound donation ids',
    donationsWithoutPrice.map(d => d.id),
  );
  for (const donation of donationsWithoutPrice) {
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
  }
  logger.debug(
    'FillPricesForDonationsWithoutPriceInLatestRound filled prices',
    filledPrices,
  );
  return {
    redirectUrl: '/admin/resources/QfRoundHistory',
    record: {},
    notice: {
      message: `${donationsWithoutPrice.length} donations without price found. ${filledPrices.length} prices filled`,
      type: 'success',
    },
  };
};

export const qfRoundHistoryTab = {
  resource: QfRoundHistory,
  options: {
    properties: {
      project: {
        isVisible: {
          list: false,
          edit: false,
          filter: true,
          show: true,
        },
      },
      qfRound: {
        isVisible: {
          list: false,
          edit: false,
          filter: true,
          show: true,
        },
      },
      uniqueDonors: {
        isVisible: true,
      },
      donationsCount: {
        isVisible: true,
      },
      raisedFundInUsd: {
        isVisible: true,
      },
      matchingFund: {
        isVisible: true,
      },
      distributedFundNetwork: {
        isVisible: true,
      },
      distributedFundTxHash: {
        isVisible: {
          list: false,
          edit: true,
          filter: true,
          show: true,
        },
      },

      createdAt: {
        type: 'string',
        isVisible: {
          list: true,
          edit: false,
          filter: false,
          show: true,
        },
      },
      updatedAt: {
        type: 'string',
        isVisible: {
          list: true,
          edit: false,
          filter: false,
          show: true,
        },
      },
    },
    actions: {
      delete: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      bulkDelete: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },

      edit: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction({ currentAdmin }, ResourceActions.EDIT),
      },
      show: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction({ currentAdmin }, ResourceActions.SHOW),
      },
      updateQfRoundHistories: {
        actionType: 'resource',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.UPDATE_QF_ROUND_HISTORIES,
          ),
        handler: updateQfRoundHistory,
        component: false,
      },
      RelateDonationsWithDistributedFunds: {
        actionType: 'resource',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.RELATE_DONATIONS_WITH_DISTRIBUTED_FUNDS,
          ),
        handler: CreateRelatedDonationsForQfRoundHistoryRecords,
        component: false,
      },
      FillPricesForDonationsWithoutPriceInLatestRound: {
        actionType: 'resource',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.FILL_PRICES_FOR_DONATIONS_WITHOUT_PRICE_IN_LATEST_ROUND,
          ),
        handler: FillPricesForDonationsWithoutPriceInLatestRound,
        component: false,
      },
    },
  },
};
