import { RecurringDonation } from '../../../entities/recurringDonation';

export const RecurringDonationTab = {
  resource: RecurringDonation,

  options: {},

  actions: {
    new: {
      isVisible: false,
    },
    edit: {
      isVisible: false,
    },
    delete: {
      isVisible: false,
    },
    bulkDelete: {
      isVisible: false,
    },
  },
};
