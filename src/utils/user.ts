import axios from 'axios';
import { logger } from '../utils/logger';

const validateEmailWithRegex = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate email with external service - VerifyRight
 *
 * @param email string
 * @returns boolean
 */
export const validateEmailWithExternalService = async (
  email: string,
): Promise<boolean> => {
  try {
    const verifyRightUrl = process.env.VERIFY_RIGHT_URL;
    const verifyRightToken = process.env.VERIFY_RIGHT_TOKEN;

    if (!verifyRightUrl || !verifyRightToken) {
      logger.error('VerifyRight configuration missing');
      return validateEmailWithRegex(email);
    }

    const requestUrl = `${verifyRightUrl}/${email}?token=${verifyRightToken}`;

    const response = await axios.get(requestUrl, {
      headers: { Accept: 'application/json' },
    });

    if (response.data.status === false && response.data.error) {
      logger.warn(
        `VerifyRight API flagged email: ${email} - ${response.data.error.message}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 400) {
        logger.warn(
          `VerifyRight rejected email as invalid: ${email} - ${error.response.data?.error?.message || 'Invalid email format'}`,
        );
        return false;
      }
      if (error.response.status === 502) {
        logger.warn(
          `VerifyRight rejected email as invalid: ${email} - ${error.response.data?.error?.message || 'Invalid email format'}`,
        );
        return false;
      }
    }

    logger.error('VerifyRight validation service error:', error);
    return validateEmailWithRegex(email);
  }
};
