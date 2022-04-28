import { NextFunction, Request, Response } from 'express';
import { errorMessages } from '../utils/errorMessages';
import {
  createBasicAuthentication,
  decodeBasicAuthentication,
} from '../utils/utils';

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
      username !== process.env.API_GIV_USERNAMR ||
      password !== process.env.API_GIV_PASSWORD
    ) {
      throw new Error(errorMessages.UN_AUTHORIZED);
    }
    next();
  } catch (e) {
    throw new Error(errorMessages.UN_AUTHORIZED);
  }
};
