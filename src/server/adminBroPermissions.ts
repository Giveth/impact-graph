import { UserRole } from '../entities/user';

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
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const userPermissions = {
  [UserRole.ADMIN]: {
    delete: false,
    new: true,
    show: true,
    edit: true,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const projectStatusHistoryPermissions = {
  [UserRole.ADMIN]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const campaignPermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    new: true,
    show: true,
    edit: true,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: true,
    show: true,
    edit: true,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const projectStatusReasonPermissions = {
  [UserRole.ADMIN]: {
    delete: false,
    new: true,
    show: true,
    edit: true,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
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
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const projectStatusPermissions = {
  [UserRole.ADMIN]: {
    delete: false,
    new: false,
    show: true,
    edit: true,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const projectPermissions = {
  [UserRole.ADMIN]: {
    delete: false,
    new: false,
    show: false,
    edit: true,
    bulkDelete: false,
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
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
    exportFilterToCsv: true,
    listProject: false,
    unlistProject: false,
    verifyProject: false,
    rejectProject: false,
    revokeBadge: false,
    activateProject: false,
    deactivateProject: false,
    cancelProject: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
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
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
    exportFilterToCsv: true,
    listProject: false,
    unlistProject: false,
    verifyProject: false,
    rejectProject: false,
    revokeBadge: false,
    activateProject: false,
    deactivateProject: false,
    cancelProject: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
    exportFilterToCsv: false,
    listProject: false,
    unlistProject: false,
    verifyProject: false,
    rejectProject: false,
    revokeBadge: false,
    activateProject: false,
    deactivateProject: false,
    cancelProject: false,
  },
  // Add more roles here as needed
};

const projectUpdatePermissions = {
  [UserRole.ADMIN]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
    addFeaturedProjectUpdate: true,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
    addFeaturedProjectUpdate: true,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
    addFeaturedProjectUpdate: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
    addFeaturedProjectUpdate: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
    addFeaturedProjectUpdate: false,
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
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
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
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const tokenPermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    new: true,
    show: true,
    edit: true,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const donationPermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    new: true,
    show: true,
    edit: true,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const projectVerificationFormPermissions = {
  [UserRole.ADMIN]: {
    delete: true,
    edit: true,
    show: true,
    new: false, // some actions are disabled even for admins
    verifyProject: true,
    makeEditableByUser: true,
    rejectProject: true,
    verifyProjects: true,
    rejectProjects: true,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    edit: false,
    show: true,
    new: false,
    verifyProject: false,
    makeEditableByUser: false,
    rejectProject: false,
    verifyProjects: false,
    rejectProjects: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: true,
    edit: true,
    show: true,
    new: false,
    verifyProject: true,
    makeEditableByUser: true,
    rejectProject: true,
    verifyProjects: true,
    rejectProjects: true,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    edit: false,
    show: true,
    new: false,
    verifyProject: true,
    makeEditableByUser: false,
    rejectProject: false,
    verifyProjects: false,
    rejectProjects: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    edit: false,
    show: false,
    new: false,
    verifyProject: false,
    makeEditableByUser: false,
    rejectProject: false,
    verifyProjects: false,
    rejectProjects: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const mainCategoryPermissions = {
  [UserRole.ADMIN]: {
    delete: false,
    new: true,
    show: true,
    edit: true,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const categoryPermissions = {
  [UserRole.ADMIN]: {
    delete: false,
    new: true,
    show: true,
    edit: true,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

const broadcastNotificationPermissions = {
  [UserRole.ADMIN]: {
    delete: false,
    new: true,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.OPERATOR]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.VERIFICATION_FORM_REVIEWER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    delete: false,
    new: false,
    show: true,
    edit: false,
    bulkDelete: false,
  },
  [UserRole.RESTRICTED]: {
    delete: false,
    new: false,
    show: false,
    edit: false,
    bulkDelete: false,
  },
  // Add more roles here as needed
};

// Methods to grant access to resource actions
export const canAccessCategoryAction = ({ currentAdmin }, action: string) => {
  if (!currentAdmin) return false;

  const rolePermission = categoryPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessMainCategoryAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = mainCategoryPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessBroadcastNotificationAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = broadcastNotificationPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessOrganizationAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = organizationPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessUserAction = ({ currentAdmin }, action: string) => {
  if (!currentAdmin) return false;

  const rolePermission = userPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessProjectStatusHistoryAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = projectStatusHistoryPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessProjectStatusReasonAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = projectStatusReasonPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessProjectAddressAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = projectAddressPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessProjectStatusAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = projectStatusPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessProjectAction = ({ currentAdmin }, action: string) => {
  if (!currentAdmin) return false;

  const rolePermission = projectPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessProjectUpdateAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = projectUpdatePermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessThirdPartyProjectImportAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = thirdPartyProjectImportPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessFeaturedUpdateAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = featuredUpdatePermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessTokenAction = ({ currentAdmin }, action: string) => {
  if (!currentAdmin) return false;

  const rolePermission = tokenPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessDonationAction = ({ currentAdmin }, action: string) => {
  if (!currentAdmin) return false;

  const rolePermission = donationPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessProjectVerificationFormAction = (
  { currentAdmin },
  action: string,
) => {
  if (!currentAdmin) return false;

  const rolePermission = projectVerificationFormPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};

export const canAccessCampaignAction = ({ currentAdmin }, action: string) => {
  if (!currentAdmin) return false;

  const rolePermission = campaignPermissions[currentAdmin.role];
  if (!rolePermission) {
    return false;
  }
  return rolePermission[action];
};
