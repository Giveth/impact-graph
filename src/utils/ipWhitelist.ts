import config from '../config';
import { logger } from './logger';

// Get whitelisted IPs from environment variable
const getWhitelistedIPs = (): string[] => {
  const whitelistConfig = config.get('CAUSE_PROJECT_IP_WHITELIST') as string;
  if (!whitelistConfig) {
    return [];
  }
  return whitelistConfig.split(',').map(ip => ip.trim());
};

// Get client IP from request
const getClientIP = (req: any): string => {
  // Handle case where req is undefined or null
  if (!req) {
    return 'unknown';
  }

  // Check for forwarded headers (common in proxy setups)
  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Check for real IP header
  const realIP = req.headers?.['x-real-ip'];
  if (realIP) {
    return realIP;
  }

  // Fallback to connection remote address
  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

// Check if IP is whitelisted
export const isIPWhitelisted = (req: any): boolean => {
  const whitelistedIPs = getWhitelistedIPs();

  // If no IPs are whitelisted, allow all (for development)
  if (whitelistedIPs.length === 0) {
    logger.warn(
      'No IPs whitelisted for cause project endpoints - allowing all requests',
    );
    return true;
  }

  const clientIP = getClientIP(req);

  // Check if client IP is in whitelist
  const isAllowed = whitelistedIPs.some(whitelistedIP => {
    // Support for CIDR notation (e.g., 192.168.1.0/24)
    if (whitelistedIP.includes('/')) {
      return isIPInCIDR(clientIP, whitelistedIP);
    }
    // Direct IP match
    return clientIP === whitelistedIP;
  });

  if (!isAllowed) {
    logger.warn('IP not whitelisted for cause project endpoint', {
      clientIP,
      whitelistedIPs,
    });
  }

  return isAllowed;
};

// Check if IP is in CIDR range
const isIPInCIDR = (ip: string, cidr: string): boolean => {
  try {
    const [cidrIP, prefix] = cidr.split('/');
    const mask = parseInt(prefix);

    const ipParts = ip.split('.').map(part => parseInt(part));
    const cidrParts = cidrIP.split('.').map(part => parseInt(part));

    // Convert to 32-bit integers
    const ipInt =
      (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const cidrInt =
      (cidrParts[0] << 24) +
      (cidrParts[1] << 16) +
      (cidrParts[2] << 8) +
      cidrParts[3];

    const maskInt = mask === 32 ? 0xffffffff : 0xffffffff << (32 - mask);

    return (ipInt & maskInt) === (cidrInt & maskInt);
  } catch (error) {
    logger.error('Error checking CIDR range', { ip, cidr, error });
    return false;
  }
};

// Middleware function to check IP whitelist
export const ipWhitelistMiddleware = (req: any, res: any, next: any) => {
  if (!isIPWhitelisted(req)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is not authorized to access this endpoint',
    });
  }
  next();
};
