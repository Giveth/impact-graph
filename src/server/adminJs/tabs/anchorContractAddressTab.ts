import { AnchorContractAddress } from '../../../entities/anchorContractAddress.js';

export const AnchorContractAddressTab = {
  resource: AnchorContractAddress,

  options: {
    actions: {
      list: {
        isVisible: false,
      },
      show: {
        isVisible: false,
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
