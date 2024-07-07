import { User } from '../../../entities/user';
import { canAccessUserAction, ResourceActions } from '../adminJsPermissions';
import { logger } from '../../../utils/logger';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');

export const usersTab = {
  resource: User,
  options: {
    properties: {
      encryptedPassword: {
        isVisible: false,
      },
      avatar: {
        isVisible: false,
      },
      password: {
        type: 'string',
        isVisible: {
          list: false,
          edit: true,
          filter: false,
          show: false,
        },
        // isVisible: false,
      },
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessUserAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessUserAction({ currentAdmin }, ResourceActions.SHOW),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessUserAction({ currentAdmin }, ResourceActions.DELETE),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessUserAction({ currentAdmin }, ResourceActions.BULK_DELETE),
      },
      new: {
        isAccessible: ({ currentAdmin }) =>
          canAccessUserAction({ currentAdmin }, ResourceActions.NEW),
        before: async request => {
          if (request.payload.password) {
            const bc = await bcrypt.hash(
              request.payload.password,
              Number(process.env.BCRYPT_SALT),
            );
            request.payload = {
              ...request.payload,
              // For making any backoffice user admin, we should just use changing it directly in DB
              encryptedPassword: bc,
              password: null,
            };
          }
          return request;
        },
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessUserAction({ currentAdmin }, ResourceActions.EDIT),
        before: async request => {
          logger.debug({ request: request.payload });
          if (request.payload.password) {
            const bc = await bcrypt.hash(
              request.payload.password,
              Number(process.env.BCRYPT_SALT),
            );
            request.payload = {
              ...request.payload,
              encryptedPassword: bc,
              password: null,
            };
          }
          return request;
        },
      },
    },
  },
};
