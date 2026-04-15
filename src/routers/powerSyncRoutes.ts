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
      const afterId = Number(request.query.afterId || 0);
      const take = Math.min(500, Number(request.query.take || 100));

      const events = await getPowerSyncOutboxEventsAfterId(afterId, take);
      response.send({ data: events });
    } catch (error) {
      logger.error('powerSyncRouter /events error', error);
      response.status(500).send({ error: 'Power sync events failed' });
    }
  },
);
