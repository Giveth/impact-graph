import { User } from '../entities/user';
import Axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { errorMessages } from '../utils/errorMessages';
import { MyContext } from '../types/MyContext';
import SentryLogger from '../sentryLogger';
import { logger } from '../utils/logger';
import {
  createUserWithPublicAddress,
  findUserById,
  findUserByWalletAddress,
} from '../repositories/userRepository';
import config from '../config';

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

interface JwtVerifiedUser {
  email?: string;
  name?: string;
  userId: number;
  token: string;
}

export const authorizationHandler = async (
  version: string,
  token: string,
): Promise<JwtVerifiedUser> => {
  let user: JwtVerifiedUser;
  switch (version) {
    case '1':
      user = await validateImpactGraphJwt(token);
      break;
    case '2':
      user = await validateAuthMicroserviceJwt(token);
      break;
    default:
      throw new Error(errorMessages.INVALID_AUTHORIZATION_VERSION);
  }
  return user;
};

export const validateImpactGraphJwt = async (
  token: string,
): Promise<JwtVerifiedUser> => {
  const secret = config.get('JWT_SECRET') as string;
  const decodedJwt: any = jwt.verify(token, secret);

  const user = {
    email: decodedJwt?.email,
    name: decodedJwt?.firstName,
    userId: decodedJwt?.userId,
    token,
  };

  return user;
};

export const validateAuthMicroserviceJwt = async (
  token: string,
): Promise<JwtVerifiedUser> => {
  const authorizationRoute = config.get(
    'AUTH_MICROSERVICE_AUTHORIZATION_URL',
  ) as string;
  let user;
  try {
    const result = await Axios.post(
      authorizationRoute,
      {
        jwt: token,
      },
      {
        headers: { 'Content-Type': `application/json` },
      },
    );

    const userAddress = result.data.publicAddress.toLowerCase();
    user = await findUserByWalletAddress(userAddress);

    if (!user) {
      user = await createUserWithPublicAddress(userAddress);
    }

    return {
      email: user?.email,
      name: user?.firstName,
      userId: user!.id,
      token,
    };
  } catch (e) {
    throw new Error(e);
  }
};
