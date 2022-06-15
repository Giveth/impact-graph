import express, { Request, Response } from 'express';
import { handleExpressError } from './standardError';
import { logger } from '../utils/logger';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import { oauth2CallbackHandler } from '../services/socialProfileService';
import { findProjectVerificationFormById } from '../repositories/projectVerificationRepository';

export const oauth2CallbacksRouter = express.Router();

const successPagePath = `${process.env.GIVETH_IO_DAPP_BASE_URL}`;
export const SOCIAL_PROFILES_PREFIX = '/socialProfiles';
const generateDappVerificationUrl = async (params: {
  projectVerificationId: number;
  url: string;
}): Promise<string> => {
  const { projectVerificationId, url } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  return `${successPagePath}/${projectVerificationForm?.project?.slug}`;
};

oauth2CallbacksRouter.get(
  `/callback/discord`,
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
        await generateDappVerificationUrl({
          url: successPagePath,
          projectVerificationId: socialProfile.projectVerificationForm.id,
        }),
      );
    } catch (e) {
      logger.error(`/callback/discord error`, e);
      handleExpressError(response, e);
    }
  },
);

oauth2CallbacksRouter.get(
  `/callback/google`,
  async (request: Request, response: Response) => {
    try {
      const socialProfile = await oauth2CallbackHandler({
        state: request.query.state as string,
        authorizationCodeOrAccessToken: decodeURI(request.query.code as string),
        socialNetwork: SOCIAL_NETWORKS.GOOGLE,
      });
      // TODO should get redirect address from frontend
      response.redirect(
        await generateDappVerificationUrl({
          url: successPagePath,
          projectVerificationId: socialProfile.projectVerificationForm.id,
        }),
      );
    } catch (e) {
      logger.error(`/callback/discord error`, e);
      handleExpressError(response, e);
    }
  },
);
oauth2CallbacksRouter.get(
  `/callback/linkedin`,
  async (request: Request, response: Response) => {
    try {
      const socialProfile = await oauth2CallbackHandler({
        state: request.query.state as string,
        authorizationCodeOrAccessToken: decodeURI(request.query.code as string),
        socialNetwork: SOCIAL_NETWORKS.LINKEDIN,
      });
      // TODO should get redirect address from frontend
      response.redirect(
        await generateDappVerificationUrl({
          url: successPagePath,
          projectVerificationId: socialProfile.projectVerificationForm.id,
        }),
      );
    } catch (e) {
      logger.error(`/callback/discord error`, e);
      handleExpressError(response, e);
    }
  },
);
