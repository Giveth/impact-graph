import Router from 'express-promise-router';
import { Request, Response } from 'express';
import { apiGivAuthentication } from '../middleware/apiGivAuthentication';
import { createDonation } from '../repositories/donationRepository';
import { errorMessages } from '../utils/errorMessages';
import { Donation } from '../entities/donation';
export const apiGivRouter = Router();
apiGivRouter.post(
  'http://localhost:4000/apigive/donations',
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
    if (request.body.amount <= 0) {
      throw new Error(errorMessages.AMOUNT_IS_INVALID);
    }
    const donation = await Donation.create({
      amount: Number(request.body.amount),
      transactionId: request.body.transactionId?.toLowerCase(),
      transactionNetworkId: Number(request.body.transactionNetworkId),
      tokenAddress: request.body.tokenAddress,
      createdAt: new Date(),
      segmentNotified: true,
      toWalletAddress: request.body.toWalletAddress.toString().toLowerCase(),
      fromWalletAddress: request.body.fromWalletAddress
        .toString()
        .toLowerCase(),
      anonymous: false,
    });
    const result = await donation.save();
    // tslint:disable-next-line:no-console
    console.log('result rest rout------->', result);
    response.json({ result });
  },
);
