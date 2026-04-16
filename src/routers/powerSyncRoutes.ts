import express, { Request, Response } from 'express';
import { powerSyncAuthentication } from '../middleware/powerSyncAuthentication';
import { getPowerSyncOutboxEventsAfterId } from '../repositories/powerSyncOutboxRepository';
import { logger } from '../utils/logger';

export const powerSyncRouter = express.Router();

powerSyncRouter.get(
  '/events',
  powerSyncAuthentication,
  async (request: Request, response: Response) => {
    try {
      const afterIdRaw = request.query.afterId;
      const takeRaw = request.query.take;

      const afterId =
        afterIdRaw === undefined ? 0 : Number.parseInt(String(afterIdRaw), 10);
      if (!Number.isInteger(afterId) || afterId < 0) {
        response.status(400).send({ error: 'Invalid afterId' });
        return;
      }

      const parsedTake =
        takeRaw === undefined ? 100 : Number.parseInt(String(takeRaw), 10);
      if (!Number.isInteger(parsedTake)) {
        response.status(400).send({ error: 'Invalid take' });
        return;
      }
      const take = Math.max(1, Math.min(500, parsedTake));

      const events = await getPowerSyncOutboxEventsAfterId(afterId, take);
      response.send({ data: events });
    } catch (error) {
      logger.error('powerSyncRouter /events error', error);
      response.status(500).send({ error: 'Power sync events failed' });
    }
  },
);
