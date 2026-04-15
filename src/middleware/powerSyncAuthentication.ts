import { NextFunction, Request, Response } from 'express';

export const powerSyncAuthentication = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const configuredPassword = process.env.POWER_SYNC_PASSWORD;
  if (!configuredPassword) {
    res
      .status(503)
      .send({ error: 'Power sync authentication is not configured' });
    return;
  }

  const headerName = (
    process.env.POWER_SYNC_PASSWORD_HEADER || 'x-power-sync-password'
  ).toLowerCase();
  const headerValue = req.headers[headerName];

  if (typeof headerValue !== 'string' || headerValue !== configuredPassword) {
    res.status(401).send({ error: 'Unauthorized' });
    return;
  }

  next();
};
