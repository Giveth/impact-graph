import { Response } from 'express';

let clients: Response[] = [];
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

// Add a new client to the SSE stream
export function addClient(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.flushHeaders();

  clients.push(res);

  // Remove the client on disconnect
  res.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
}

// Notify all connected clients about a new donation
export function notifyClients(data: TNewDonation) {
  clients.forEach(client => client.write(`data: ${JSON.stringify(data)}\n\n`));
}

// Notify all connected clients about a failed donation
export function notifyDonationFailed(data: TDraftDonationFailed) {
  clients.forEach(client => client.write(`data: ${JSON.stringify(data)}\n\n`));
}
