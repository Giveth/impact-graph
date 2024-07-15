import { NextFunction, Request, Response } from 'express';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages.js';
import { decodeBasicAuthentication } from '../utils/utils.js';
import { logger } from '../utils/logger.js';
import {
  ApiGivStandardError,
  handleExpressError,
} from '../routers/standardError.js';

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
      throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
    }
    const username = basicAuthenticationData?.split(':')[0];
    const password = basicAuthenticationData?.split(':')[1];

    if (
      !username ||
      !password ||
      username !== process.env.API_GIV_USERNAME ||
      password !== process.env.API_GIV_PASSWORD
    ) {
      throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
    }

    next();
  } catch (e) {
    logger.error('apiGivAuthentication error', e);
    handleExpressError(
      res,
      new ApiGivStandardError(
        i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED),
        401,
      ),
    );
  }
};
