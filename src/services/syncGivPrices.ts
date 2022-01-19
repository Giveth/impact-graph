import { Donation } from '../entities/donation';
import { schedule } from 'node-cron';
import { fetchGivHistoricPrice } from './givPriceService';
import { convertExponentialNumber } from '../utils/utils';
import { updateTotalDonationsOfProject } from './donationService';
import { logger } from '../utils/logger';

const cronJobTime =
  process.env.REVIEW_OLD_GIV_PRICES_CRONJOB_EXPRESSION || '0 0 * * *';

export const runUpdateHistoricGivPrices = () => {
  logger.debug('runUpdateHistoricGivPrices() has been called');
  schedule(cronJobTime, async () => {
    await updateOldGivDonationPrice();
  });
};

const toFixNumber = (input: number, digits: number): number => {
  return convertExponentialNumber(Number(input.toFixed(digits)));
};

const updateOldGivDonationPrice = async () => {
  const donations = await Donation.findXdaiGivDonationsWithoutPrice();
  logger.debug('updateOldGivDonationPrice donations count', donations.length);
  for (const donation of donations) {
    logger.debug(
      'updateOldGivDonationPrice() updating accurate price, donationId',
      donation.id,
    );
    try {
      const givHistoricPrices = await fetchGivHistoricPrice(
        donation.transactionId,
        donation.transactionNetworkId,
      );
      logger.debug('Update donation usd price ', {
        donationId: donation.id,
        ...givHistoricPrices,
        valueEth: toFixNumber(
          donation.amount * givHistoricPrices.givPriceInEth,
          6,
        ),
      });
      donation.priceEth = toFixNumber(givHistoricPrices.ethPriceInUsd, 6);
      donation.priceUsd = toFixNumber(givHistoricPrices.givPriceInUsd, 3);
      donation.valueUsd = toFixNumber(
        donation.amount * givHistoricPrices.givPriceInUsd,
        3,
      );
      donation.valueEth = toFixNumber(
        donation.amount * givHistoricPrices.givPriceInEth,
        6,
      );
      await donation.save();
      await updateTotalDonationsOfProject(donation.projectId);
    } catch (e) {
      logger.error('Update GIV donation valueUsd error', e.message);
    }
  }
};
