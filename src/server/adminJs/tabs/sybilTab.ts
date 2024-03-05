import { Sybil } from '../../../entities/sybil';
import {
  canAccessProjectStatusReasonAction,
  ResourceActions,
} from '../adminJsPermissions';
import {
  AdminJsContextInterface,
  AdminJsRequestInterface,
} from '../adminJs-types';
import { logger } from '../../../utils/logger';
import csv from 'csvtojson';
import { messages } from '../../../utils/messages';
import { errorMessages } from '../../../utils/errorMessages';
import { findUserByWalletAddress } from '../../../repositories/userRepository';

export const createSybil = async (
  request: AdminJsRequestInterface,
  response,
  context?: AdminJsContextInterface,
) => {
  let message = messages.SYBIL_HAS_BEEN_CREATED_SUCCESSFULLY;
  logger.debug('createSybil has been called() ', request.payload);

  let type = 'success';
  try {
    const { walletAddress, qfRoundId, csvData } = request.payload;
    if (csvData) {
      // Parse the CSV data
      const jsonArray = await csv().fromString(csvData);

      // Validate and extract all unique walletAddresses
      const walletAddresses: string[] = [];
      for (const obj of jsonArray) {
        if (!obj.walletAddress || !obj.qfRoundId) {
          throw new Error('Missing walletAddress or qfRoundId in CSV row');
        }
        walletAddresses.push(obj.walletAddress.toLowerCase());
      }
      const uniqueWalletAddresses = [...new Set(walletAddresses)];

      // Get userIds for all walletAddresses
      const users = await Sybil.query(`
        SELECT id, "walletAddress" FROM public.user WHERE lower("walletAddress") IN (${uniqueWalletAddresses
          .map(address => `'${address}'`)
          .join(', ')})
    `);

      // Map lowercased walletAddress to userId
      const userIdMap = new Map(
        users?.map(row => [row.walletAddress.toLowerCase(), row.id]),
      );
      // Construct values for insertion
      const values = jsonArray
        .map(obj => {
          const walletAddressUserId = userIdMap.get(
            obj.walletAddress.toLowerCase(),
          );
          return walletAddressUserId
            ? `(${walletAddressUserId}, ${Number(obj.qfRoundId)})`
            : null;
        })
        .filter(value => value !== null) // Filter out any rows where userId was not found
        .join(',');

      if (!values) {
        throw new Error(errorMessages.NONE_OF_WALLET_ADDRESSES_FOUND_IN_DB);
      }

      // Upsert query
      const upsertQuery = `
          INSERT INTO sybil ( "userId", "qfRoundId")
          VALUES ${values}
          ON CONFLICT ("userId", "qfRoundId") DO NOTHING
     `;
      // Execute the query
      await Sybil.query(upsertQuery);
    } else {
      const user = await findUserByWalletAddress(walletAddress);
      if (!user) {
        throw new Error(errorMessages.USER_NOT_FOUND);
      }
      const sybil = new Sybil();
      sybil.userId = user.id;
      sybil.qfRoundId = qfRoundId;
      await sybil.save();
    }

    logger.debug('Sybil has been created successfully', request.payload);
  } catch (e) {
    message = e.message;
    type = 'danger';
    logger.error('create sybil error', e);
  }

  response.send({
    redirectUrl: '/admin/resources/Sybil',
    record: {},
    notice: {
      message,
      type,
    },
  });
};

export const SybilTab = {
  resource: Sybil,

  options: {
    properties: {
      walletAddress: {
        type: 'textarea',
        isVisible: {
          filter: false,
          list: false,
          show: false,
          new: true,
          edit: true,
        },
      },

      qfRoundId: {
        isVisible: true,
      },
      userId: {
        isVisible: {
          filter: true,
          list: true,
          show: true,
          new: false,
          edit: false,
        },
      },
      csvData: {
        type: 'textarea',
        // Csv file columns
        // qfRoundId,walletAddress
        isVisible: {
          filter: false,
          list: false,
          show: false,
          new: true,
          edit: true,
        },
      },
    },

    actions: {
      new: {
        handler: createSybil,

        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.NEW,
          ),
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.EDIT,
          ),
      },
      delete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.EDIT,
          ),
      },
      bulkDelete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.EDIT,
          ),
      },
    },
  },
};
