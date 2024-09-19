import express, { Request, Response } from 'express';
import { apiGivAuthentication } from '../middleware/apiGivAuthentication';
import { findDonationsByTransactionId } from '../repositories/donationRepository';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { Donation } from '../entities/donation';
import { findProjectByWalletAddress } from '../repositories/projectRepository';
import { findTokenByTokenAddress } from '../repositories/tokenRepository';
import { ProjStatus } from '../entities/project';
import { logger } from '../utils/logger';
import { findTokenByNetworkAndSymbol } from '../utils/tokenUtils';
import { ApiGivStandardError, handleExpressError } from './standardError';
import { findUserByWalletAddress } from '../repositories/userRepository';
import { User } from '../entities/user';
import { updateProjectStatistics } from '../services/projectService';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../services/userService';

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
        throw new ApiGivStandardError(
          i18n.__(translationErrorMessagesKeys.DUPLICATE_TX_HASH),
          400,
        );
      }
      const project = await findProjectByWalletAddress(toWalletAddress);
      if (!project) {
        throw new ApiGivStandardError(
          i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND),
          400,
        );
      }
      if (project.status.id !== ProjStatus.active) {
        throw new ApiGivStandardError(
          i18n.__(
            translationErrorMessagesKeys.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
          ),
          400,
        );
      }
      const donor = (await findUserByWalletAddress(fromWalletAddress)) as User;
      if (amount <= 0) {
        throw new ApiGivStandardError(
          i18n.__(translationErrorMessagesKeys.AMOUNT_IS_INVALID),
          400,
        );
      }

      const token = tokenAddress
        ? await findTokenByTokenAddress(tokenAddress)
        : await findTokenByNetworkAndSymbol(transactionNetworkId, currency);
      if (!token) {
        throw new ApiGivStandardError(
          i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND),
          400,
        );
      }
      const donationData = Donation.create({
        fromWalletAddress,
        toWalletAddress,
        user: donor,
        anonymous,
        isProjectGivbackEligible: project.isGivbackEligible,
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
      });
      const result = await donationData.save();
      await updateProjectStatistics(project.id);
      await updateUserTotalDonated(result.userId);
      await updateUserTotalReceived(project.adminUserId);

      response.send(result);
    } catch (e) {
      logger.error('create donation in /donations webservice ', e);
      handleExpressError(response, e);
    }
  },
);
