import { RecurringDonation } from '../../../entities/recurringDonation';

export const RecurringDonationTab = {
  resource: RecurringDonation,

  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          currentAdmin && currentAdmin.role !== 'qfManager',
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          currentAdmin && currentAdmin.role !== 'qfManager',
      },
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
  },
};
