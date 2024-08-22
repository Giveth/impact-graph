import WebSocket from 'ws';
import { logger } from '../../utils/logger';

export function startWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  // Handle WebSocket connections
  wss.on('connection', ws => {
    ws.on('message', message => {
      logger.info(`Received message: ${message}`);
    });
  });

  // Broadcast a message to all connected clients
  function broadcastMessage(message) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Exported function to be called from cron job
  function notifyDonationAdded(donation) {
    const message = JSON.stringify({
      type: 'new-donation',
      data: donation,
    });
    broadcastMessage(message);
  }

  // Exported function to to be called when marking draft donation as failed
  function notifyDraftDonationFailed(donation) {
    const message = JSON.stringify({
      type: 'draft-donation-failed',
      data: donation,
    });
    broadcastMessage(message);
  }

  // Export the notifyDonationAdded function so it can be used externally
  return {
    notifyDonationAdded,
    notifyDraftDonationFailed,
  };
}
