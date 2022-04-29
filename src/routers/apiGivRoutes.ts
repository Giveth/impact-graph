import Router from 'express-promise-router';
import { Request, Response } from 'express';
import { apiGivAuthentication } from '../middleware/apiGivAuthentication';
import { createDonation } from '../repositories/donationRepository';
import { errorMessages } from '../utils/errorMessages';
import { Donation } from '../entities/donation';
import { findProjectByWalletAddress } from '../repositories/projectRepository';
import { findTokenByTokenAddres } from '../repositories/tokenRepository';
export const apiGivRouter = Router();
apiGivRouter.post(
  '/donations',
  apiGivAuthentication,
  async (request: Request, response: Response) => {
    const donationData: any = {
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
      segmentNotified: request.body.segmentNotified,
      isFiat: request.body.isFiat,
      speedup: false,
    };
    if (request.body.amount <= 0) {
      throw new Error(errorMessages.AMOUNT_IS_INVALID);
    }
    const project = await findProjectByWalletAddress(
      request.body.toWalletAddress,
    );
    if (!project) {
      throw new Error(errorMessages.PROJECT_NOT_FOUND);
    }

    const token = await findTokenByTokenAddres(request.body.tokenAddress);

    donationData.project = project;
    donationData.isTokenEligibleForGivback = token.isGivbackEligible;
    const result = await Donation.create(donationData).save();
    response.json({ result });
  },
);
