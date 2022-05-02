import { NextFunction, Request, Response } from 'express';
import { errorMessages } from '../utils/errorMessages';
import {
  createBasicAuthentication,
  decodeBasicAuthentication,
} from '../utils/utils';
import { logger } from '../utils/logger';
import {
  ApiGivStandardError,
  handleExpressError,
} from '../routers/standardError';

export const apiGivAuthentication = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const basicAuthentication =
      req?.headers?.Authorization || req?.headers?.authorization;
    const basicAuthenticationData =
      decodeBasicAuthentication(basicAuthentication);
    if (!basicAuthenticationData) {
      throw new Error(errorMessages.UN_AUTHORIZED);
    }
    const username = basicAuthenticationData?.split(':')[0];
    const password = basicAuthenticationData?.split(':')[1];

    if (
      !username ||
      !password ||
      username !== process.env.API_GIV_USERNAME ||
      password !== process.env.API_GIV_PASSWORD
    ) {
      throw new Error(errorMessages.UN_AUTHORIZED);
    }

    next();
  } catch (e) {
    logger.error('apiGivAuthentication error', e);
    handleExpressError(
      res,
      new ApiGivStandardError(errorMessages.UN_AUTHORIZED, 401),
    );
  }
};
