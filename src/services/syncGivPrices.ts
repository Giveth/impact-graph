import { Donation } from '../entities/donation';
import { schedule } from 'node-cron';
import { fetchGivHistoricPrice } from './givPriceService';

import { getRepository } from 'typeorm';

import config from '../config';

const cronJobTime =
  (config.get('REVIEW_OLD_GIV_PRICES_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * *';

export const runUpdateHistoricGivPrices = () => {
  console.log('runUpdateHistoricGivPrices() has been called');
  schedule(cronJobTime, async () => {
    await updateOldGivDonationPrice();
  });
};

const updateOldGivDonationPrice = async () => {
  const donations = await Donation.initialGivDonations();
  for (const donation of donations) {
    console.log(
      'updateOldGivDonationPrice() updating accurate price:',
      donation.id,
    );
    const givHistoricPrices = await fetchGivHistoricPrice(
      donation.transactionId,
    );

    const donationRepository = getRepository(Donation);
    await donationRepository.save({
      id: donation.id,
      priceUsd: givHistoricPrices.givPriceInUsd,
      priceEth: givHistoricPrices.givPriceInEth,
      valueUsd: donation.amount * givHistoricPrices.givPriceInUsd,
      valueEth: donation.amount * givHistoricPrices.givPriceInEth,
    });
  }
};
