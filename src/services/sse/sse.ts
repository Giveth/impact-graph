import { Response } from 'express';
import { Redis } from 'ioredis';
import { logger } from '../../utils/logger';
import { redisConfig } from '../../redis';

let clients: Response[] = [];

// Redis Pub/Sub for cross-instance SSE coordination
const redisSubscriber = new Redis(redisConfig);
const redisPublisher = new Redis(redisConfig);
const SSE_CHANNEL = 'sse:notifications';

type TNewDonation = {
  type: 'new-donation';
  data: {
    donationId: number;
    draftDonationId: number;
  };
};

type TDraftDonationFailed = {
  type: 'draft-donation-failed';
  data: {
    draftDonationId: number;
    expiresAt?: Date;
  };
};

// Subscribe to Redis notifications and forward to connected clients
redisSubscriber.subscribe(SSE_CHANNEL, (err, count) => {
  if (err) {
    logger.error('SSE: Failed to subscribe to Redis channel', { error: err });
  } else {
    logger.debug('SSE: Subscribed to Redis channel', {
      channel: SSE_CHANNEL,
      subscriptionCount: count,
    });
  }
});

redisSubscriber.on('message', (channel, message) => {
  if (channel === SSE_CHANNEL) {
    logger.debug('SSE: Received message from Redis', {
      totalLocalClients: clients.length,
      message,
    });

    // Broadcast to all clients connected to THIS instance
    // Filter out dead clients on write failure
    clients = clients.filter(client => {
      try {
        client.write(`data: ${message}\n\n`);
        return true;
      } catch (error) {
        logger.error('SSE: Error writing to client, removing from list', {
          error,
        });
        return false;
      }
    });
  }
});

// Helper function to publish messages to Redis
function publishToRedis(message: string, context: string) {
  redisPublisher
    .publish(SSE_CHANNEL, message)
    .then(() => logger.debug(`SSE: ${context} published successfully`))
    .catch(error => logger.error(`SSE: Failed to publish ${context}`, { error }));
}

// Add a new client to the SSE stream
export function addClient(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.flushHeaders();

  clients.push(res);
  logger.debug('SSE: New client connected', { totalClients: clients.length });

  // Send a welcome message to the newly connected client
  const data = {
    type: 'initial',
    data: 'Welcome to the server',
  };
  res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Remove the client on disconnect
  res.on('close', () => {
    clients = clients.filter(client => client !== res);
    logger.debug('SSE: Client disconnected', { totalClients: clients.length });
    res.end();
  });
}

// Notify all connected clients about a new donation
// This publishes to Redis, which then broadcasts to ALL instances
export function notifyClients(data: TNewDonation) {
  const message = JSON.stringify(data);

  logger.debug('SSE: notifyClients called - publishing to Redis', {
    totalLocalClients: clients.length,
    data,
  });

  // Publish to Redis using shared connection - this will be received by ALL instances (including this one)
  publishToRedis(message, 'new-donation');
}

// Notify all connected clients about a failed donation
// This publishes to Redis, which then broadcasts to ALL instances
export function notifyDonationFailed(data: TDraftDonationFailed) {
  const message = JSON.stringify(data);

  logger.debug('SSE: notifyDonationFailed called - publishing to Redis', {
    totalLocalClients: clients.length,
    data,
  });

  // Publish to Redis using shared connection - this will be received by ALL instances (including this one)
  redisPublisher
    .publish(SSE_CHANNEL, message)
    .then(() => {
      logger.debug('SSE: Published failed donation to Redis successfully');
    })
    .catch(error => {
      logger.error('SSE: Failed to publish failed donation to Redis', {
        error,
      });
    });
}
