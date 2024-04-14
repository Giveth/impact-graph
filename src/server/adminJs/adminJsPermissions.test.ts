import { assert } from 'chai';
import {
  ResourceActions,
  canAccessUserAction,
  canAccessCategoryAction,
  canAccessMainCategoryAction,
  canAccessOrganizationAction,
  canAccessProjectAction,
  canAccessProjectAddressAction,
  canAccessProjectStatusAction,
  canAccessProjectStatusHistoryAction,
  canAccessProjectUpdateAction,
  canAccessQfRoundAction,
  canAccessQfRoundHistoryAction,
  canAccessDonationAction,
  canAccessProjectVerificationFormAction,
  canAccessFeaturedUpdateAction,
  canAccessThirdPartyProjectImportAction,
  canAccessBroadcastNotificationAction,
  canAccessProjectStatusReasonAction,
  canAccessCampaignAction,
} from './adminJsPermissions';
import { UserRole } from '../../entities/user';

const roles = Object.freeze([
  UserRole.ADMIN,
  UserRole.CAMPAIGN_MANAGER,
  UserRole.VERIFICATION_FORM_REVIEWER,
  UserRole.OPERATOR,
]);

const actions = Object.values(ResourceActions);

// sum up the actions for each role on each page
const actionsPerRole = Object.freeze({
  admin: {
    users: ['list', 'new', 'show', 'edit'],
    organization: ['list', 'show'],
    projectStatusHistory: ['list', 'show'],
    campaign: ['list', 'show', 'new', 'edit', 'delete'],
    qfRound: ['list', 'show', 'new', 'edit', 'returnAllDonationData'],
    qfRoundHistory: [
      'list',
      'show',
      'edit',
      'delete',
      'bulkDelete',
      'updateQfRoundHistories',
    ],
    projectStatusReason: ['list', 'show', 'new', 'edit'],
    projectAddress: ['list', 'show', 'new', 'edit', 'delete', 'bulkDelete'],
    projectStatus: ['list', 'show', 'edit'],
    project: [
      'list',
      'show',
      'edit',
      'exportFilterToCsv',
      'listProject',
      'unlistProject',
      'verifyProject',
      'rejectProject',
      'revokeBadge',
      'activateProject',
      'deactivateProject',
      'cancelProject',
    ],
    projectUpdate: ['list', 'show', 'addFeaturedProjectUpdate'],
    thirdPartyProjectImport: [
      'list',
      'show',
      'new',
      'edit',
      'delete',
      'bulkDelete',
    ],
    featuredUpdate: ['list', 'show', 'new', 'edit', 'delete', 'bulkDelete'],
    donation: ['list', 'show', 'new', 'edit', 'delete', 'exportFilterToCsv'],
    projectVerificationForm: [
      'list',
      'delete',
      'edit',
      'show',
      'verifyProject',
      'makeEditableByUser',
      'rejectProject',
      'verifyProjects',
      'rejectProjects',
    ],
    mainCategory: ['list', 'show', 'new', 'edit'],
    category: ['list', 'show', 'new', 'edit'],
    broadcastNotification: ['list', 'show', 'new'],
  },
  campaignManager: {
    users: ['list', 'show'],
    organization: ['list', 'show'],
    projectStatusHistory: ['list', 'show'],
    campaign: ['list', 'show', 'new', 'edit'],
    qfRound: ['list', 'show'],
    qfRoundHistory: ['list', 'show'],
    projectStatusReason: ['list', 'show'],
    projectAddress: ['list', 'show'],
    projectStatus: ['list', 'show'],
    project: ['list', 'show'],
    projectUpdate: ['list', 'show'],
    thirdPartyProjectImport: ['list', 'show'],
    featuredUpdate: ['list', 'show'],
    donation: ['list', 'show'],
    projectVerificationForm: ['list', 'show', 'verifyProject'],
    mainCategory: ['list', 'show'],
    category: ['list', 'show'],
    broadcastNotification: ['list', 'show'],
  },
  reviewer: {
    users: ['list', 'show'],
    organization: ['list', 'show'],
    projectStatusHistory: ['list', 'show'],
    campaign: ['list', 'show'],
    qfRound: ['list', 'show'],
    qfRoundHistory: ['list', 'show'],
    projectStatusReason: ['list', 'show'],
    projectAddress: ['list', 'show'],
    projectStatus: ['list', 'show'],
    project: [
      'list',
      'show',
      'exportFilterToCsv',
      'listProject',
      'unlistProject',
      'verifyProject',
      'rejectProject',
      'revokeBadge',
      'activateProject',
      'deactivateProject',
      'cancelProject',
    ],
    projectUpdate: ['list', 'show'],
    thirdPartyProjectImport: ['list', 'show'],
    featuredUpdate: ['list', 'show'],
    donation: ['list', 'show', 'exportFilterToCsv'],
    projectVerificationForm: [
      'list',
      'delete',
      'edit',
      'show',
      'verifyProject',
      'makeEditableByUser',
      'rejectProject',
      'verifyProjects',
      'rejectProjects',
    ],
    mainCategory: ['list', 'show'],
    category: ['list', 'show'],
    broadcastNotification: ['list', 'show'],
  },
  operator: {
    users: ['list', 'show'],
    organization: ['list', 'show'],
    projectStatusHistory: ['list', 'show'],
    campaign: ['list', 'show'],
    qfRound: ['list', 'show'],
    qfRoundHistory: ['list', 'show'],
    projectStatusReason: ['list', 'show'],
    projectAddress: ['list', 'show'],
    projectStatus: ['list', 'show'],
    project: [
      'list',
      'show',
      'exportFilterToCsv',
      'listProject',
      'unlistProject',
      'verifyProject',
      'rejectProject',
      'revokeBadge',
      'activateProject',
      'deactivateProject',
      'cancelProject',
    ],
    projectUpdate: ['list', 'show', 'addFeaturedProjectUpdate'],
    thirdPartyProjectImport: ['list', 'show'],
    featuredUpdate: ['list', 'show'],
    donation: ['list', 'show', 'exportFilterToCsv'],
    projectVerificationForm: ['list', 'show'],
    mainCategory: ['list', 'show'],
    category: ['list', 'show'],
    broadcastNotification: ['list', 'show'],
  },
  qfManager: {
    qfRound: ['list', 'show', 'edit', 'new', 'returnAllDonationData'],
    qfRoundHistory: [
      'list',
      'show',
      'edit',
      'delete',
      'bulkDelete',
      'updateQfRoundHistories',
    ],
    project: ['list', 'show', 'addToQfRound', 'removeFromQfRound'],
  },
});

const callFunction = (
  role: UserRole,
  page: string,
  action: ResourceActions,
): boolean => {
  switch (page) {
    case 'users':
      return canAccessUserAction({ currentAdmin: { role } }, action);
    case 'organization':
      return canAccessOrganizationAction({ currentAdmin: { role } }, action);
    case 'projectStatusHistory':
      return canAccessProjectStatusHistoryAction(
        { currentAdmin: { role } },
        action,
      );
    case 'campaign':
      return canAccessCampaignAction({ currentAdmin: { role } }, action);
    case 'qfRound':
      return canAccessQfRoundAction({ currentAdmin: { role } }, action);
    case 'qfRoundHistory':
      return canAccessQfRoundHistoryAction({ currentAdmin: { role } }, action);
    case 'projectStatusReason':
      return canAccessProjectStatusReasonAction(
        { currentAdmin: { role } },
        action,
      );
    case 'projectAddress':
      return canAccessProjectAddressAction({ currentAdmin: { role } }, action);
    case 'projectStatus':
      return canAccessProjectStatusAction({ currentAdmin: { role } }, action);
    case 'project':
      return canAccessProjectAction({ currentAdmin: { role } }, action);
    case 'projectUpdate':
      return canAccessProjectUpdateAction({ currentAdmin: { role } }, action);
    case 'thirdPartyProjectImport':
      return canAccessThirdPartyProjectImportAction(
        { currentAdmin: { role } },
        action,
      );
    case 'featuredUpdate':
      return canAccessFeaturedUpdateAction({ currentAdmin: { role } }, action);
    case 'donation':
      return canAccessDonationAction({ currentAdmin: { role } }, action);
    case 'projectVerificationForm':
      return canAccessProjectVerificationFormAction(
        { currentAdmin: { role } },
        action,
      );
    case 'mainCategory':
      return canAccessMainCategoryAction({ currentAdmin: { role } }, action);
    case 'category':
      return canAccessCategoryAction({ currentAdmin: { role } }, action);
    case 'broadcastNotification':
      return canAccessBroadcastNotificationAction(
        { currentAdmin: { role } },
        action,
      );
    default:
      return false;
  }
};

describe('canAccessUserAction test cases', () => {
  roles.forEach(role => {
    Object.keys(actionsPerRole[role]).forEach(page => {
      actions.forEach(action => {
        it(`should return ${actionsPerRole[role][page].includes(action)} for ${role} --> ${action} on ${page}`, function () {
          assert.strictEqual(
            callFunction(role, page, action),
            actionsPerRole[role][page].includes(action),
          );
        });
      });
    });
  });
});
