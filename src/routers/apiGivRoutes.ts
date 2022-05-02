import express, { Request, Response } from 'express';
import { apiGivAuthentication } from '../middleware/apiGivAuthentication';
import {
  createDonation,
  findDonationsByTransactionId,
} from '../repositories/donationRepository';
import { errorMessages } from '../utils/errorMessages';
import { Donation } from '../entities/donation';
import { findProjectByWalletAddress } from '../repositories/projectRepository';
import { findTokenByTokenAddress } from '../repositories/tokenRepository';
import { ProjStatus } from '../entities/project';
import { logger } from '../utils/logger';
import { findTokenByNetworkAndSymbol } from '../utils/tokenUtils';
import { ApiGivStandardError, handleExpressError } from './standardError';
import { updateTotalDonationsOfProject } from '../services/donationService';
import { findUserByWalletAddress } from '../repositories/userRepository';

export const apiGivRouter = express.Router();
apiGivRouter.post(
  '/donations',
  apiGivAuthentication,
  async (request: Request, response: Response) => {
    try {
      // Add segment events , for reciever and sender
      const { body } = request;
      const {
        anonymous,
        fromWalletAddress,
        toWalletAddress,
        amount,
        nonce,
        transactionId,
        transactionNetworkId,
        currency,
        tokenAddress,
        status,
        donationType,
        segmentNotified,
        isFiat,
        priceUsd,
        valueUsd,
      } = body;
      const donation = await findDonationsByTransactionId(transactionId);
      if (donation) {
        throw new ApiGivStandardError(errorMessages.DUPLICATE_TX_HASH, 400);
      }
      const project = await findProjectByWalletAddress(toWalletAddress);
      if (!project) {
        throw new ApiGivStandardError(errorMessages.PROJECT_NOT_FOUND, 400);
      }
      if (project.status.id !== ProjStatus.active) {
        throw new ApiGivStandardError(
          errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
          400,
        );
      }
      const donor = await findUserByWalletAddress(fromWalletAddress);
      if (amount <= 0) {
        throw new ApiGivStandardError(errorMessages.AMOUNT_IS_INVALID, 400);
      }

      const token = tokenAddress
        ? await findTokenByTokenAddress(tokenAddress)
        : await findTokenByNetworkAndSymbol(transactionNetworkId, currency);
      if (!token) {
        throw new ApiGivStandardError(errorMessages.TOKEN_NOT_FOUND, 400);
      }
      const donationData = {
        fromWalletAddress,
        toWalletAddress,
        user: donor,
        anonymous,
        isProjectVerified: project.verified,
        project,
        amount,
        valueUsd,
        priceUsd,
        currency,
        transactionId,
        nonce,
        transactionNetworkId,
        createdAt: new Date(),
        status,
        donationType,
        tokenAddress,
        segmentNotified,
        isFiat,
        isTokenEligibleForGivback: token.isGivbackEligible,
        speedup: false,
      };
      const result = await Donation.create(donationData).save();
      await updateTotalDonationsOfProject(project.id);

      response.send(result);
    } catch (e) {
      logger.error('create donation in /donations webservice ', e);
      handleExpressError(response, e);
    }
  },
);
