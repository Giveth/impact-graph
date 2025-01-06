import { logger } from '../../utils/logger';

/**
 * Extracts the redirect URL from request headers for AdminJS actions
 * @param request - The AdminJS action request object
 * @param resourceName - The name of the resource (e.g., 'Project', 'User')
 * @returns The URL to redirect to after action completion
 */
export const getRedirectUrl = (request: any, resourceName: string): string => {
  const refererIndex =
    request?.rawHeaders?.findIndex(h => h.toLowerCase() === 'referer') || -1;
  const referrerUrl =
    refererIndex !== -1 ? request.rawHeaders[refererIndex + 1] : false;

  // Default fallback URL if no referer is found
  const defaultUrl = `/admin/resources/${resourceName}`;

  try {
    if (referrerUrl) {
      const url = new URL(referrerUrl);
      // If it's the main list view (no search params), add a timestamp to force refresh
      if (url.pathname === `/admin/resources/${resourceName}` && !url.search) {
        return `${url.pathname}?timestamp=${Date.now()}`;
      }
      return url.pathname + url.search;
    }
  } catch (error) {
    logger.error('Error parsing referrer URL:', error);
  }

  // Add timestamp to default URL as well
  return `${defaultUrl}?timestamp=${Date.now()}`;
};
