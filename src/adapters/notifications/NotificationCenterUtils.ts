import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics.js';

export const buildProjectLink = (
  eventName: NOTIFICATIONS_EVENT_NAMES,
  projectSlug?: string,
) => {
  if (!projectSlug) return;

  const projectLink = `${process.env.WEBSITE_URL}/project/${projectSlug}`;
  switch (eventName) {
    case NOTIFICATIONS_EVENT_NAMES.PROJECT_ADD_AN_UPDATE_USERS_WHO_SUPPORT:
      return projectLink + '?tab=updates';
    case NOTIFICATIONS_EVENT_NAMES.PROJECT_UPDATE_ADDED_OWNER:
      return projectLink + '?tab=updates';
    default:
      return projectLink;
  }
};
