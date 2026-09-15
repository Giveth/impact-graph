import { NextFunction, Request, Response } from 'express';
import { getCurrentAdminJsSession } from '../server/adminJs/adminJs';
import { UserRole } from '../entities/user';

/**
 * Guards AdminJS-side Express routes that live OUTSIDE the AdminJS router
 * (which authenticates via its own session middleware), e.g.
 * `/admin/download/:filename`. Rejects requests that do not carry a valid
 * AdminJS session cookie, so admin-only artifacts (exported CSVs with user
 * PII) can never be fetched by anonymous or non-admin callers.
 */
export const adminSessionAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // getCurrentAdminJsSession returns the db user behind the session cookie,
  // or false when there is no valid session
  const admin = await getCurrentAdminJsSession(req);

  // Re-check the role in case it was downgraded after login (same criterion
  // as the login lookup: role != restricted)
  if (!admin || admin.role !== UserRole.ADMIN) {
    res.status(401).send({ error: 'Unauthorized' });
    return;
  }

  next();
};
