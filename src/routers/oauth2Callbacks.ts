import express, { Request, Response } from 'express';
import { handleExpressError } from './standardError';
import { logger } from '../utils/logger';
import { getSocialNetworkAdapter } from '../adapters/adaptersFactory';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import {
  findSocialProfileById,
  verifySocialProfileById,
} from '../repositories/socialProfileRepository';
import { errorMessages } from '../utils/errorMessages';

export const oauth2CallbacksRouter = express.Router();
oauth2CallbacksRouter.get(
  '/socialProfiles/callback/discord',
  async (request: Request, response: Response) => {
    try {
      const { state, access_token } = request.query;
      const discordAdapter = getSocialNetworkAdapter(SOCIAL_NETWORKS.DISCORD);
      const { username } = await discordAdapter.getUserInfoByOauth2Code({
        state: state as string,
        oauth2Code: access_token as string,
      });
      const socialProfile = await findSocialProfileById(Number(state));
      if (socialProfile?.socialNetworkId !== username) {
        throw new Error(
          errorMessages.VERIFIED_USERNAME_IS_DIFFERENT_WITH_CLAIMED_ONE,
        );
      }
      await verifySocialProfileById({
        socialProfileId: socialProfile?.id,
      });
      // TODO should get redirect address from frontend
      response.redirect('/');
    } catch (e) {
      logger.error('create donation in /donations webservice ', e);
      handleExpressError(response, e);
    }
  },
);
