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
import { oauth2CallbackHandler } from '../services/socialProfileService';

export const oauth2CallbacksRouter = express.Router();
oauth2CallbacksRouter.get(
  '/socialProfiles/callback/discord',
  async (request: Request, response: Response) => {
    try {
      await oauth2CallbackHandler({
        socialNetwork: SOCIAL_NETWORKS.DISCORD,
        state: request.query.state as string,
        authorizationCodeOrAccessToken: decodeURI(
          request.query.access_token as string,
        ),
      });
      // TODO should get redirect address from frontend
      response.redirect('/');
    } catch (e) {
      logger.error('/socialProfiles/callback/discord error ', e);
      handleExpressError(response, e);
    }
  },
);

oauth2CallbacksRouter.get(
  '/socialProfiles/callback/google',
  async (request: Request, response: Response) => {
    try {
      await oauth2CallbackHandler({
        state: request.query.state as string,
        authorizationCodeOrAccessToken: decodeURI(request.query.code as string),
        socialNetwork: SOCIAL_NETWORKS.GOOGLE,
      });
      // TODO should get redirect address from frontend
      response.redirect('/');
    } catch (e) {
      logger.error('/socialProfiles/callback/discord error ', e);
      handleExpressError(response, e);
    }
  },
);
