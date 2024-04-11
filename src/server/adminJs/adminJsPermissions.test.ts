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
    users: ['new', 'show', 'edit'],
    organization: ['show'],
    projectStatusHistory: ['show'],
    campaign: ['show', 'new', 'edit', 'delete'],
    qfRound: [
      'show',
      'new',
      'edit',
      'delete',
      'addToQfRound',
      'removeFromQfRound',
    ],
    qfRoundHistory: [
      'show',
      'edit',
      'delete',
      'bulkDelete',
      'updateQfRoundHistories',
    ],
    projectStatusReason: ['show', 'new', 'edit'],
    projectAddress: ['show', 'new', 'edit', 'delete', 'bulkDelete'],
    projectStatus: ['show', 'edit'],
    project: [
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
    projectUpdate: ['show', 'addFeaturedProjectUpdate'],
    thirdPartyProjectImport: ['show', 'new', 'edit', 'delete', 'bulkDelete'],
    featuredUpdate: ['show', 'new', 'edit', 'delete', 'bulkDelete'],
    donation: ['show', 'new', 'edit', 'delete', 'exportFilterToCsv'],
    projectVerificationForm: [
      'delete',
      'edit',
      'show',
      'verifyProject',
      'makeEditableByUser',
      'rejectProject',
      'verifyProjects',
      'rejectProjects',
    ],
    mainCategory: ['show', 'new', 'edit'],
    category: ['show', 'new', 'edit'],
    broadcastNotification: ['show', 'new'],
  },
  campaignManager: {
    users: ['show'],
    organization: ['show'],
    projectStatusHistory: ['show'],
    campaign: ['show', 'new', 'edit'],
    qfRound: ['show', 'addToQfRound', 'removeFromQfRound'],
    qfRoundHistory: ['show'],
    projectStatusReason: ['show'],
    projectAddress: ['show'],
    projectStatus: ['show'],
    project: ['show'],
    projectUpdate: ['show'],
    thirdPartyProjectImport: ['show'],
    featuredUpdate: ['show'],
    donation: ['show'],
    projectVerificationForm: ['show', 'verifyProject'],
    mainCategory: ['show'],
    category: ['show'],
    broadcastNotification: ['show'],
  },
  reviewer: {
    users: ['show'],
    organization: ['show'],
    projectStatusHistory: ['show'],
    campaign: ['show'],
    qfRound: ['show'],
    qfRoundHistory: ['show'],
    projectStatusReason: ['show'],
    projectAddress: ['show'],
    projectStatus: ['show'],
    project: [
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
    projectUpdate: ['show'],
    thirdPartyProjectImport: ['show'],
    featuredUpdate: ['show'],
    donation: ['show', 'exportFilterToCsv'],
    projectVerificationForm: [
      'delete',
      'edit',
      'show',
      'verifyProject',
      'makeEditableByUser',
      'rejectProject',
      'verifyProjects',
      'rejectProjects',
    ],
    mainCategory: ['show'],
    category: ['show'],
    broadcastNotification: ['show'],
  },
  operator: {
    users: ['show'],
    organization: ['show'],
    projectStatusHistory: ['show'],
    campaign: ['show'],
    qfRound: ['show'],
    qfRoundHistory: ['show'],
    projectStatusReason: ['show'],
    projectAddress: ['show'],
    projectStatus: ['show'],
    project: [
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
    projectUpdate: ['show', 'addFeaturedProjectUpdate'],
    thirdPartyProjectImport: ['show'],
    featuredUpdate: ['show'],
    donation: ['show', 'exportFilterToCsv'],
    projectVerificationForm: ['show'],
    mainCategory: ['show'],
    category: ['show'],
    broadcastNotification: ['show'],
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
