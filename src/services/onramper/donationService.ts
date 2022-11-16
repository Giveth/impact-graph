import { Donation } from '../../entities/donation';
import { i18n } from '../../utils/errorMessages';
import { OnRamperFiatTransaction } from './fiatTransaction';

export const createFiatDonationFromOnramper = async (
  fiatTransaction: OnRamperFiatTransaction,
) => {
  const donation = await Donation.findOne({
    transactionId: fiatTransaction.payload.txId,
  });
  if (donation) throw new Error(i18n.__('FIAT_DONATION_ALREADY_EXISTS'));
};
