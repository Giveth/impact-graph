import { NextFunction, Request, Response } from 'express';
import { errorMessages } from '../utils/errorMessages';

export const apiGivAuthentication = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const username = req?.headers?.username;
    const password = req?.headers?.password;
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
