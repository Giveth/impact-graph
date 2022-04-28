import Router from 'express-promise-router';
import { Request, Response } from 'express';
import { apiGivAuthentication } from '../middleware/apiGivAuthentication';
import { createDonation } from '../repositories/donationRepository';
const router = Router();
router.post(
  '/apigive/donations',
  apiGivAuthentication,
  async (request: Request, response: Response) => {
    const donationData = {
      fromWalletAddress: request.body.fromWalletAddress,
      toWalletAddress: request.body.toWalletAddress,
      amount: request.body.amount,
      valueUsd: request.body.valueUsd,
      priceUsd: request.body.priceUsd,
      currency: request.body.currency,
      transactionId: request.body.transactionId,
      nonce: request.body.nonce,
      transactionNetworkId: request.body.transactionNetworkId,
      status: request.body.status,
      donationType: request.body.donationType,
      tokenAddress: request.body.tokenAddress,
    };
    const result = await createDonation(donationData);
    await sendResponse({
      request,
      response,
      result,
    });
  },
);
