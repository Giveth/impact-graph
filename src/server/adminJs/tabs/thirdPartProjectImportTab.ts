import { ThirdPartyProjectImport } from '../../../entities/thirdPartyProjectImport.js';
import {
  canAccessThirdPartyProjectImportAction,
  ResourceActions,
} from '../adminJsPermissions.js';
import { AdminJsRequestInterface } from '../adminJs-types.js';
import { logger } from '../../../utils/logger.js';
import {
  createProjectFromChangeNonProfit,
  getChangeNonProfitByNameOrIEN,
} from '../../../services/changeAPI/nonProfits.js';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages.js';

export const importThirdPartyProject = async (
  request: AdminJsRequestInterface,
  response,
  context,
) => {
  const { currentAdmin } = context;
  let message = `Project successfully imported`;
  let type = 'success';
  let record;

  try {
    logger.debug('import third party project', request.payload);
    let nonProfit;
    let newProject;
    const { thirdPartyAPI, projectName } = request.payload;
    switch (thirdPartyAPI) {
      case 'Change': {
        nonProfit = await getChangeNonProfitByNameOrIEN(projectName);
        newProject = await createProjectFromChangeNonProfit(nonProfit);
        break;
      }
      default: {
        throw i18n.__(
          translationErrorMessagesKeys.NOT_SUPPORTED_THIRD_PARTY_API,
        );
      }
    }
    // keep record of all created projects and who did from which api
    const importHistoryRecord = ThirdPartyProjectImport.create({
      projectName: newProject.title,
      project: newProject,
      user: currentAdmin,
      thirdPartyAPI,
    });
    await importHistoryRecord.save();
    record = importHistoryRecord;
  } catch (e) {
    message = e?.message || e;
    type = 'danger';
    logger.error('import third party project error', e.message);
  }

  response.send({
    redirectUrl: '/admin/resources/ThirdPartyProjectImport',
    record: {},
    notice: {
      message,
      type,
    },
  });

  return {
    record,
  };
};

export const thirdPartProjectImportTab = {
  resource: ThirdPartyProjectImport,
  options: {
    properties: {
      thirdPartyAPI: {
        availableValues: [{ value: 'Change', label: 'Change API' }],
        isVisible: true,
      },
      projectName: {
        isVisible: { show: false, edit: true, new: true, list: false },
      },
      userId: {
        isVisible: { show: true, edit: false, new: false, list: true },
      },
      projectId: {
        isVisible: { show: true, edit: false, new: false, list: true },
      },
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessThirdPartyProjectImportAction(
            { currentAdmin },
            ResourceActions.LIST,
          ),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessThirdPartyProjectImportAction(
            { currentAdmin },
            ResourceActions.SHOW,
          ),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessThirdPartyProjectImportAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
      edit: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessThirdPartyProjectImportAction(
            { currentAdmin },
            ResourceActions.EDIT,
          ),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessThirdPartyProjectImportAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      new: {
        handler: importThirdPartyProject,
        isAccessible: ({ currentAdmin }) =>
          canAccessThirdPartyProjectImportAction(
            { currentAdmin },
            ResourceActions.NEW,
          ),
      },
    },
  },
};
