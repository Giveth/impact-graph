import { Response } from 'express';

export class ApiGivStandardError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const handleExpressError = (
  res: Response,
  error: ApiGivStandardError | Error,
): void => {
  if (error instanceof ApiGivStandardError) {
    res.status(error.statusCode).send({ message: error.message });
  } else {
    res.status(500).send({ message: error.message });
  }
};
