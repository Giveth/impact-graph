import express, { Request, Response } from 'express';
import { handleExpressError } from './standardError';
import { logger } from '../utils/logger';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import { oauth2CallbackHandler } from '../services/socialProfileService';

export const oauth2CallbacksRouter = express.Router();

const successPagePath = `${process.env.GIVETH_IO_DAPP_BASE_URL}/:projectVerificationFormId/success`;
const failPagePath = `${process.env.GIVETH_IO_DAPP_BASE_URL}/:projectVerificationFormId/fail`;
const generateDappVerificationUrl = (params: {
  projectVerificationId: number;
  url: string;
}): string => {
  const { projectVerificationId, url } = params;
  return url.replace(
    ':projectVerificationFormId',
    String(projectVerificationId),
  );
};

oauth2CallbacksRouter.get(
  '/socialProfiles/callback/discord',
  async (request: Request, response: Response) => {
    try {
      const socialProfile = await oauth2CallbackHandler({
        socialNetwork: SOCIAL_NETWORKS.DISCORD,
        state: request.query.state as string,
        authorizationCodeOrAccessToken: decodeURI(
          request.query.access_token as string,
        ),
      });
      response.redirect(
        generateDappVerificationUrl({
          url: successPagePath,
          projectVerificationId: socialProfile.projectVerificationForm.id,
        }),
      );
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
      const socialProfile = await oauth2CallbackHandler({
        state: request.query.state as string,
        authorizationCodeOrAccessToken: decodeURI(request.query.code as string),
        socialNetwork: SOCIAL_NETWORKS.GOOGLE,
      });
      // TODO should get redirect address from frontend
      response.redirect(
        generateDappVerificationUrl({
          url: successPagePath,
          projectVerificationId: socialProfile.projectVerificationForm.id,
        }),
      );
    } catch (e) {
      logger.error('/socialProfiles/callback/discord error ', e);
      handleExpressError(response, e);
    }
  },
);
oauth2CallbacksRouter.get(
  '/socialProfiles/callback/linkedin',
  async (request: Request, response: Response) => {
    try {
      const socialProfile = await oauth2CallbackHandler({
        state: request.query.state as string,
        authorizationCodeOrAccessToken: decodeURI(request.query.code as string),
        socialNetwork: SOCIAL_NETWORKS.LINKEDIN,
      });
      // TODO should get redirect address from frontend
      response.redirect(
        generateDappVerificationUrl({
          url: successPagePath,
          projectVerificationId: socialProfile.projectVerificationForm.id,
        }),
      );
    } catch (e) {
      logger.error('/socialProfiles/callback/discord error ', e);
      handleExpressError(response, e);
    }
  },
);
