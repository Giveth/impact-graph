import { UserRole } from '../../entities/user';

// Current Actions Enum
export enum ResourceActions {
  LIST = 'list',
  DELETE = 'delete',
  NEW = 'new',
  SHOW = 'show',
  EDIT = 'edit',
  BULK_DELETE = 'bulkDelete',
  EXPORT_FILTER_TO_CSV = 'exportFilterToCsv',
  LIST_PROJECT = 'listProject',
  UNLIST_PROJECT = 'unlistProject',
  VERIFY_PROJECT = 'verifyProject',
  REJECT_PROJECT = 'rejectProject',
  REVOKE_BADGE = 'revokeBadge',
  ACTIVATE_PROJECT = 'activateProject',
  DEACTIVATE_PROJECT = 'deactivateProject',
  CANCEL_PROJECT = 'cancelProject',
  ADD_FEATURED_PROJECT_UPDATE = 'addFeaturedProjectUpdate',
  MAKE_EDITABLE_BY_USER = 'makeEditableByUser',
  VERIFY_PROJECTS = 'verifyProjects',
  REJECT_PROJECTS = 'rejectProjects',
  ADD_PROJECT_TO_QF_ROUND = 'addToQfRound',
  REMOVE_PROJECT_FROM_QF_ROUND = 'removeFromQfRound',
  UPDATE_QF_ROUND_HISTORIES = 'updateQfRoundHistories',
  RETURN_ALL_DONATIONS_DATA = 'returnAllDonationData',
  RELATE_DONATIONS_WITH_DISTRIBUTED_FUNDS = 'relateDonationsWithDistributedFunds',
  FILL_PRICES_FOR_DONATIONS_WITHOUT_PRICE = 'fillPricesForDonationsWithoutPrice',
}

// All permissions listed per resource, per role and action
const organizationPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    show: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const userPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const projectStatusHistoryPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    show: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const campaignPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    delete: true,
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    new: true,
    show: true,
    edit: true,
  },
  // Add more roles here as needed
};

const qfRoundPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    show: true,
    returnAllDonationData: true,
    new: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  [UserRole.QF_MANAGER]: {
    list: true,
    show: true,
    returnAllDonationData: true,
    new: true,
    edit: true,
  },
  // Add more roles here as needed
};

const qfRoundHistoryPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    delete: true,
    bulkDelete: true,
    show: true,
    edit: true,
    updateQfRoundHistories: true,
    relateDonationsWithDistributedFunds: true,
    fillPricesForDonationsWithoutPrice: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  [UserRole.QF_MANAGER]: {
    list: true,
    show: true,
    updateQfRoundHistories: true,
  },
  // Add more roles here as needed
};

const projectStatusReasonPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const projectAddressPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    delete: true,
    new: true,
    show: true,
    edit: true,
    bulkDelete: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const projectStatusPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const projectPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    show: true,
    edit: true,
    exportFilterToCsv: true,
    listProject: true,
    unlistProject: true,
    verifyProject: true,
    rejectProject: true,
    revokeBadge: true,
    activateProject: true,
    deactivateProject: true,
    cancelProject: true,
    addToQfRound: true,
    removeFromQfRound: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
    exportFilterToCsv: true,
    listProject: true,
    unlistProject: true,
    verifyProject: true,
    rejectProject: true,
    revokeBadge: true,
    activateProject: true,
    deactivateProject: true,
    cancelProject: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
    exportFilterToCsv: true,
    listProject: true,
    unlistProject: true,
    verifyProject: true,
    rejectProject: true,
    revokeBadge: true,
    activateProject: true,
    deactivateProject: true,
    cancelProject: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  [UserRole.QF_MANAGER]: {
    list: true,
    show: true,
    listProject: true,
    removeFromQfRound: true,
    addToQfRound: true,
  },
  // Add more roles here as needed
};

const projectUpdatePermissions = {
  [UserRole.ADMIN]: {
    list: true,
    show: true,
    addFeaturedProjectUpdate: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
    addFeaturedProjectUpdate: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const thirdPartyProjectImportPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    delete: true,
    new: true,
    show: true,
    edit: true,
    bulkDelete: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const featuredUpdatePermissions = {
  [UserRole.ADMIN]: {
    list: true,
    delete: true,
    new: true,
    show: true,
    edit: true,
    bulkDelete: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const donationPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    delete: true,
    new: true,
    show: true,
    edit: true,
    exportFilterToCsv: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
    exportFilterToCsv: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
    exportFilterToCsv: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const projectVerificationFormPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    delete: true,
    edit: true,
    show: true,
    verifyProject: true,
    makeEditableByUser: true,
    rejectProject: true,
    verifyProjects: true,
    rejectProjects: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    delete: true,
    edit: true,
    show: true,
    verifyProject: true,
    makeEditableByUser: true,
    rejectProject: true,
    verifyProjects: true,
    rejectProjects: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const mainCategoryPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const categoryPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const broadcastNotificationPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    new: true,
    show: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const projectFraudPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    show: true,
    new: true,
    edit: true,
    delete: true,
    bulkDelete: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  [UserRole.QF_MANAGER]: {
    list: true,
    show: true,
    new: true,
    edit: true,
    delete: true,
    bulkDelete: true,
  },
  // Add more roles here as needed
};

const sybilPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    show: true,
    new: true,
    edit: true,
    delete: true,
    bulkDelete: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  [UserRole.QF_MANAGER]: {
    list: true,
    show: true,
    new: true,
    edit: true,
    delete: true,
    bulkDelete: true,
  },
  // Add more roles here as needed
};

// will be modified later on
const recurringDonationPermissions = {
  [UserRole.ADMIN]: {
    list: true,
    show: true,
    new: true,
    edit: true,
    delete: true,
    bulkDelete: true,
  },
  [UserRole.OPERATOR]: {
    list: true,
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    list: true,
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    list: true,
    show: true,
  },
  // Add more roles here as needed
};

const hasAccessToResource = (params: {
  currentAdmin: any;
  action: string;
  resourcePermissions: any;
}): boolean => {
  const { currentAdmin, action, resourcePermissions } = params;
  if (!currentAdmin) return false;

  const rolePermission = resourcePermissions[currentAdmin.role];
  if (!rolePermission) {
    // For instance it would be undefied for users with RESTRICTED role
    return false;
  }
  return Boolean(rolePermission[action]);
};

// Methods to grant access to resource actions
export const canAccessCategoryAction = ({ currentAdmin }, action: string) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: categoryPermissions,
  });
};

export const canAccessMainCategoryAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: mainCategoryPermissions,
  });
};

export const canAccessBroadcastNotificationAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: broadcastNotificationPermissions,
  });
};

export const canAccessOrganizationAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: organizationPermissions,
  });
};

export const canAccessUserAction = ({ currentAdmin }, action: string) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: userPermissions,
  });
};

export const canAccessQfRoundAction = ({ currentAdmin }, action: string) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: qfRoundPermissions,
  });
};

export const canAccessQfRoundHistoryAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: qfRoundHistoryPermissions,
  });
};

export const canAccessProjectStatusHistoryAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: projectStatusHistoryPermissions,
  });
};

export const canAccessProjectStatusReasonAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: projectStatusReasonPermissions,
  });
};

export const canAccessProjectAddressAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: projectAddressPermissions,
  });
};

export const canAccessProjectStatusAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: projectStatusPermissions,
  });
};

export const canAccessProjectAction = ({ currentAdmin }, action: string) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: projectPermissions,
  });
};

export const canAccessProjectUpdateAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: projectUpdatePermissions,
  });
};

export const canAccessThirdPartyProjectImportAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: thirdPartyProjectImportPermissions,
  });
};

export const canAccessFeaturedUpdateAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: featuredUpdatePermissions,
  });
};

export const canAccessTokenAction = ({ currentAdmin }, action: string) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: categoryPermissions,
  });
};

export const canAccessDonationAction = ({ currentAdmin }, action: string) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: donationPermissions,
  });
};

export const canAccessProjectVerificationFormAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: projectVerificationFormPermissions,
  });
};

export const canAccessCampaignAction = ({ currentAdmin }, action: string) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: campaignPermissions,
  });
};

export const canAccessProjectFraudAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: projectFraudPermissions,
  });
};

export const canAccessSybilAction = ({ currentAdmin }, action: string) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: sybilPermissions,
  });
};

export const canAccessRecurringDonationAction = (
  { currentAdmin },
  action: string,
) => {
  return hasAccessToResource({
    currentAdmin,
    action,
    resourcePermissions: recurringDonationPermissions,
  });
};
