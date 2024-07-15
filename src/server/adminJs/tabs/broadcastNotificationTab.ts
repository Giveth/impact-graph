import adminJs from 'adminjs';
import {
  ActionResponse,
  After,
  // @ts-expect-error as d
} from 'adminjs/src/backend/actions/action.interface';
// @ts-expect-error as d
import { RecordJSON } from 'adminjs/src/frontend/interfaces/record-json.interface';
import BroadcastNotification, {
  BROAD_CAST_NOTIFICATION_STATUS,
} from '../../../entities/broadcastNotification.js';
import {
  canAccessBroadcastNotificationAction,
  ResourceActions,
} from '../adminJsPermissions.js';
import {
  AdminJsContextInterface,
  AdminJsRequestInterface,
} from '../adminJs-types.js';
import { getNotificationAdapter } from '../../../adapters/adaptersFactory.js';
import { updateBroadcastNotificationStatus } from '../../../repositories/broadcastNotificationRepository.js';
import { logger } from '../../../utils/logger.js';

export const sendBroadcastNotification = async (
  response,
): Promise<After<ActionResponse>> => {
  const record: RecordJSON = response.record || {};
  if (record?.params) {
    const { html, id } = record?.params || {};
    try {
      await getNotificationAdapter().broadcastNotification({
        broadCastNotificationId: id,
        html,
      });
      await updateBroadcastNotificationStatus(
        id,
        BROAD_CAST_NOTIFICATION_STATUS.SUCCESS,
      );
    } catch (e) {
      logger.error('sendBroadcastNotification error', e);
      await updateBroadcastNotificationStatus(
        id,
        BROAD_CAST_NOTIFICATION_STATUS.FAILED,
      );
    }
  }
  return response;
};

export const broadcastNotificationTab = {
  resource: BroadcastNotification,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessBroadcastNotificationAction(
            { currentAdmin },
            ResourceActions.LIST,
          ),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessBroadcastNotificationAction(
            { currentAdmin },
            ResourceActions.SHOW,
          ),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessBroadcastNotificationAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      new: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessBroadcastNotificationAction(
            { currentAdmin },
            ResourceActions.NEW,
          ),
        before: async (
          request: AdminJsRequestInterface,
          context: AdminJsContextInterface,
        ) => {
          if (request?.payload?.html) {
            const { currentAdmin } = context;
            request.payload.adminUserId = currentAdmin?.id;
          }
          return request;
        },
        after: sendBroadcastNotification,
      },
      edit: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessBroadcastNotificationAction(
            { currentAdmin },
            ResourceActions.EDIT,
          ),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessBroadcastNotificationAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
    properties: {
      title: {
        isVisible: true,
      },
      html: {
        isVisible: {
          show: true,
          list: false,
          new: true,
          edit: true,
        },
        components: {
          // @ts-expect-error as d
          edit: adminJs.bundle('./components/MDtoHTML'),
        },
      },
      status: {
        isVisible: {
          show: true,
          list: true,
          new: false,
          edit: false,
        },
      },
      adminUserId: {
        isVisible: {
          show: true,
          list: true,
          new: false,
          edit: false,
        },
      },
    },
  },
};
