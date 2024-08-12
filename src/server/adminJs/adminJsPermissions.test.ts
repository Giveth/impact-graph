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
  canAccessSybilAction,
  canAccessProjectFraudAction,
} from './adminJsPermissions';
import { UserRole } from '../../entities/user';

const roles = Object.freeze([
  UserRole.ADMIN,
  UserRole.CAMPAIGN_MANAGER,
  UserRole.VERIFICATION_FORM_REVIEWER,
  UserRole.OPERATOR,
  UserRole.QF_MANAGER,
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
      'relateDonationsWithDistributedFunds',
      'fillPricesForDonationsWithoutPrice',
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
      'addToQfRound',
      'removeFromQfRound',
      'exportEmails',
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
    sybil: ['list', 'show', 'new', 'edit', 'delete', 'bulkDelete'],
    projectFraud: ['list', 'show', 'new', 'edit', 'delete', 'bulkDelete'],
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
    projectVerificationForm: ['list', 'show'],
    mainCategory: ['list', 'show'],
    category: ['list', 'show'],
    broadcastNotification: ['list', 'show'],
    sybil: ['list', 'show'],
    projectFraud: ['list', 'show'],
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
    sybil: ['list', 'show'],
    projectFraud: ['list', 'show'],
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
    sybil: ['list', 'show'],
    projectFraud: ['list', 'show'],
  },
  qfManager: {
    qfRound: ['list', 'show', 'edit', 'new', 'returnAllDonationData'],
    qfRoundHistory: ['list', 'show', 'updateQfRoundHistories'],
    project: [
      'list',
      'show',
      'listProject',
      'addToQfRound',
      'removeFromQfRound',
      'exportEmails',
    ],
    sybil: ['list', 'show', 'new', 'edit', 'delete', 'bulkDelete'],
    projectFraud: ['list', 'show', 'new', 'edit', 'delete', 'bulkDelete'],
  },
});

const canAccessAction = (
  role: UserRole,
  page: string,
  action: ResourceActions,
): boolean => {
  const args = { currentAdmin: { role } };

  switch (page) {
    case 'users':
      return canAccessUserAction(args, action);
    case 'organization':
      return canAccessOrganizationAction(args, action);
    case 'projectStatusHistory':
      return canAccessProjectStatusHistoryAction(args, action);
    case 'campaign':
      return canAccessCampaignAction(args, action);
    case 'qfRound':
      return canAccessQfRoundAction(args, action);
    case 'qfRoundHistory':
      return canAccessQfRoundHistoryAction(args, action);
    case 'projectStatusReason':
      return canAccessProjectStatusReasonAction(args, action);
    case 'projectAddress':
      return canAccessProjectAddressAction(args, action);
    case 'projectStatus':
      return canAccessProjectStatusAction(args, action);
    case 'project':
      return canAccessProjectAction(args, action);
    case 'projectUpdate':
      return canAccessProjectUpdateAction(args, action);
    case 'thirdPartyProjectImport':
      return canAccessThirdPartyProjectImportAction(args, action);
    case 'featuredUpdate':
      return canAccessFeaturedUpdateAction(args, action);
    case 'donation':
      return canAccessDonationAction(args, action);
    case 'projectVerificationForm':
      return canAccessProjectVerificationFormAction(args, action);
    case 'mainCategory':
      return canAccessMainCategoryAction(args, action);
    case 'category':
      return canAccessCategoryAction(args, action);
    case 'broadcastNotification':
      return canAccessBroadcastNotificationAction(args, action);
    case 'sybil':
      return canAccessSybilAction(args, action);
    case 'projectFraud':
      return canAccessProjectFraudAction(args, action);
    default:
      return false;
  }
};

// TODO Should uncomment it after https://github.com/Giveth/impact-graph/issues/1481 ( I commented this to reduce the test execution time)
describe('AdminJsPermissions', () => {
  roles.forEach(role => {
    Object.keys(actionsPerRole[role]).forEach(page => {
      actions.forEach(action => {
        it(`should return ${actionsPerRole[role][page].includes(action)} for ${role} --> ${action} on ${page}`, function () {
          assert.strictEqual(
            canAccessAction(role, page, action),
            actionsPerRole[role][page].includes(action),
          );
        });
      });
    });
  });
});
