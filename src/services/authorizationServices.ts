import { User } from '../entities/user';
import { errorMessages } from '../utils/errorMessages';
import { MyContext } from '../types/MyContext';
import SentryLogger from '../sentryLogger';
import { logger } from '../utils/logger';
import { findUserById } from '../repositories/userRepository';

// Add any other service that checks auth on a query or mutation
export const checkIfUserInRequest = (ctx: MyContext) => {
  if (!ctx.req.user) {
    throw new Error(errorMessages.AUTHENTICATION_REQUIRED);
  }
};

export const getLoggedInUser = async (ctx: MyContext) => {
  checkIfUserInRequest(ctx);

  const user = await findUserById(ctx.req.user.userId);

  if (!user) {
    const errorMessage = `No user with userId ${ctx.req.user.userId} found. This userId comes from the token. Search for 'Non-existant userToken' in logs to see the token`;
    const userMessage = 'Access denied';
    SentryLogger.captureMessage(errorMessage);
    logger.error(
      `Non-existant userToken for userId ${ctx.req.user.userId}. Token is ${ctx.req.user.token}`,
    );
    throw new Error(userMessage);
  }

  return user;
};
