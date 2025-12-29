import axios from 'axios';
import { User } from '../entities/user';
import { logger } from '../utils/logger';

/**
 * Webhook sync: send the newly created Impact-Graph user to v6-core.
 *
 * Env vars:
 * - V6_CORE_USER_SYNC_URL: full URL to the v6-core endpoint
 * - V6_CORE_USER_SYNC_PASSWORD: shared secret sent in header
 * - V6_CORE_USER_SYNC_PASSWORD_HEADER (optional): header name, default 'x-impact-graph-password'
 */
export async function syncNewImpactGraphUserToV6Core(
  user: User,
): Promise<void> {
  const url = process.env.V6_CORE_USER_SYNC_URL;
  const password = process.env.V6_CORE_USER_SYNC_PASSWORD;
  const headerName =
    process.env.V6_CORE_USER_SYNC_PASSWORD_HEADER || 'x-impact-graph-password';

  if (!url || !password) {
    logger.warn(
      'syncNewImpactGraphUserToV6Core() skipped: missing V6_CORE_USER_SYNC_URL or V6_CORE_USER_SYNC_PASSWORD',
    );
    return;
  }

  // Send only the minimal payload needed by v6-core.
  const payload = {
    id: user.id,
    walletAddress: user.walletAddress,
  };

  await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      [headerName]: password,
    },
    timeout: Number(process.env.V6_CORE_USER_SYNC_TIMEOUT_MS || 10_000),
  });
}
