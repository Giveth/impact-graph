import { NextFunction, Request, Response } from 'express';
import { errorMessages } from '../utils/errorMessages';
import {
  createBasicAuthentication,
  decodeBasicAuthentication,
} from '../utils/utils';
import { logger } from '../utils/logger';

export const apiGivAuthentication = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.error('apiGivAuthentication step1');
    const basicAuthentication =
      req?.headers?.Authorization || req?.headers?.authorization;
    const basicAuthenticationData =
      decodeBasicAuthentication(basicAuthentication);
    logger.error('apiGivAuthentication step2');

    if (!basicAuthenticationData) {
      throw new Error(errorMessages.UN_AUTHORIZED);
    }
    logger.error('apiGivAuthentication step3');

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
    logger.error('apiGivAuthentication step4');

    next();
  } catch (e) {
    throw new Error(errorMessages.UN_AUTHORIZED);
  }
};
