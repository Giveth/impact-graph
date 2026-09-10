import path from 'path';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import type { IncomingMessage } from 'connect';

/**
 * Resolves the current AdminJS admin session for a request (from its signed
 * session cookie). Mirrors the signature of `getCurrentAdminJsSession` in
 * `./adminJs/adminJs`; a truthy value means "authenticated admin", `false`
 * means "no valid session". It is injected (rather than imported directly) so
 * this module — and its unit test — stay decoupled from the AdminJS/Redis
 * machinery.
 */
export type AdminJsSessionResolver = (req: IncomingMessage) => Promise<unknown>;

// AdminJS-generated CSV exports live here (e.g. project/donor email-address
// lists). Resolved relative to this file so it matches where projectsTab
// writes them (src/server/adminJs/tabs/exports).
const exportsDir = path.join(__dirname, '/adminJs/tabs/exports');

/**
 * Builds the handler for `GET /admin/download/:filename`, which serves the
 * AdminJS CSV exports created from the projects tab.
 *
 * Those exports contain PII (project/donor email addresses). The route is
 * registered as a plain Express route, OUTSIDE the AdminJS authenticated
 * router, so it does NOT inherit AdminJS auth. Without the explicit session
 * check below, anyone could download the files. We therefore require a valid
 * admin session and reject everything else with 401.
 */
export const createDownloadAdminJsExportHandler = (
  getCurrentAdminJsSession: AdminJsSessionResolver,
) => {
  return async (req: Request, res: Response): Promise<void> => {
    // Require a valid admin session. `getCurrentAdminJsSession` throws when the
    // request carries no cookie header, so treat any failure (thrown or falsy)
    // as "not authenticated".
    let isAuthenticatedAdmin = false;
    try {
      isAuthenticatedAdmin = Boolean(await getCurrentAdminJsSession(req));
    } catch (e) {
      logger.error('admin export download auth check failed', e);
    }
    if (!isAuthenticatedAdmin) {
      res.status(401).send('Unauthorized');
      return;
    }

    // Prevent path traversal: reduce to a bare filename (strips any `../`),
    // then confirm the resolved path is directly inside the exports dir.
    const filePath = path.join(exportsDir, path.basename(req.params.filename));
    if (path.dirname(filePath) !== exportsDir) {
      res.status(400).send('Invalid filename');
      return;
    }
    res.download(filePath);
  };
};
