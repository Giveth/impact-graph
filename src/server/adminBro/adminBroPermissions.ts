import { UserRole } from '../../entities/user';

// Current Actions Enum
export enum ResourceActions {
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
}

// All permissions listed per resource, per role and action
const organizationPermissions = {
  [UserRole.ADMIN]: {
    show: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const userPermissions = {
  [UserRole.ADMIN]: {
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const projectStatusHistoryPermissions = {
  [UserRole.ADMIN]: {
    show: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const campaignPermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    new: true,
    show: true,
    edit: true,
  },
  // Add more roles here as needed
};

const projectStatusReasonPermissions = {
  [UserRole.ADMIN]: {
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const projectAddressPermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    new: true,
    show: true,
    edit: true,
    bulkDelete: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const projectStatusPermissions = {
  [UserRole.ADMIN]: {
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const projectPermissions = {
  [UserRole.ADMIN]: {
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
  },
  [UserRole.OPERATOR]: {
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
    show: true,
  },
  // Add more roles here as needed
};

const projectUpdatePermissions = {
  [UserRole.ADMIN]: {
    show: true,
    addFeaturedProjectUpdate: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
    addFeaturedProjectUpdate: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const thirdPartyProjectImportPermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    new: true,
    show: true,
    edit: true,
    bulkDelete: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const featuredUpdatePermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    new: true,
    show: true,
    edit: true,
    bulkDelete: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const tokenPermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const donationPermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const projectVerificationFormPermissions = {
  [UserRole.ADMIN]: {
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
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
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
    show: true,
    verifyProject: true,
  },
  // Add more roles here as needed
};

const mainCategoryPermissions = {
  [UserRole.ADMIN]: {
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const categoryPermissions = {
  [UserRole.ADMIN]: {
    new: true,
    show: true,
    edit: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const broadcastNotificationPermissions = {
  [UserRole.ADMIN]: {
    new: true,
    show: true,
  },
  [UserRole.OPERATOR]: {
    show: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    show: true,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    show: true,
  },
  // Add more roles here as needed
};

const hasAccessToResource = (params: {
  currentAdmin: any;
  action: string;
  resourcePermissions: any;
}): Boolean => {
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
