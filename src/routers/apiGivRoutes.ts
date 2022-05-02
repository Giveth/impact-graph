import express, { Request, Response } from 'express';
import { apiGivAuthentication } from '../middleware/apiGivAuthentication';
import {
  createDonation,
  findDonationsByTransactionId,
} from '../repositories/donationRepository';
import { errorMessages } from '../utils/errorMessages';
import { Donation } from '../entities/donation';
import { findProjectByWalletAddress } from '../repositories/projectRepository';
import { findTokenByTokenAddres } from '../repositories/tokenRepository';
import { ProjStatus } from '../entities/project';
import { logger } from '../utils/logger';
import { findTokenByNetworkAndSymbol } from '../utils/tokenUtils';
import { ApiGivStandardError, handleExpressError } from './standardError';

export const apiGivRouter = express.Router();
apiGivRouter.post(
  '/donations',
  apiGivAuthentication,
  async (request: Request, response: Response) => {
    try {
      const { body } = request;
      const donation = await findDonationsByTransactionId(body.transactionId);
      if (donation) {
        throw new ApiGivStandardError(errorMessages.DUPLICATE_TX_HASH, 400);
      }
      const project = await findProjectByWalletAddress(body.toWalletAddress);
      if (!project) {
        throw new ApiGivStandardError(errorMessages.PROJECT_NOT_FOUND, 400);
      }
      if (project.status.id !== ProjStatus.active) {
        throw new ApiGivStandardError(
          errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
          400,
        );
      }
      if (body.amount <= 0) {
        throw new ApiGivStandardError(errorMessages.AMOUNT_IS_INVALID, 400);
      }

      const token = body.tokenAddress
        ? await findTokenByTokenAddres(body.tokenAddress)
        : await findTokenByNetworkAndSymbol(
            body.transactionNetworkId,
            body.currency,
          );
      if (!token) {
        throw new ApiGivStandardError(errorMessages.TOKEN_NOT_FOUND, 400);
      }
      const donationData = {
        fromWalletAddress: body.fromWalletAddress,
        toWalletAddress: body.toWalletAddress,
        isProjectVerified: project.verified,
        project,
        amount: body.amount,
        valueUsd: body.valueUsd,
        priceUsd: body.priceUsd,
        currency: body.currency,
        transactionId: body.transactionId,
        nonce: body.nonce,
        transactionNetworkId: body.transactionNetworkId,
        createdAt: new Date(),
        status: body.status,
        donationType: body.donationType,
        tokenAddress: body.tokenAddress,
        segmentNotified: body.segmentNotified,
        isFiat: body.isFiat,
        isTokenEligibleForGivback: token.isGivbackEligible,
        speedup: false,
      };
      const result = await Donation.create(donationData).save();

      response.send(result);
    } catch (e) {
      logger.error('create donation in /donations webservice ', e);
      handleExpressError(response, e);
    }
  },
);
