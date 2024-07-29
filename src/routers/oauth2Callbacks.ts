import express, { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { SOCIAL_NETWORKS } from '../entities/socialProfile.js';
import {
  getProjectVerificationFormByState,
  oauth2CallbackHandler,
} from '../services/socialProfileService.js';
import { findProjectVerificationFormById } from '../repositories/projectVerificationRepository.js';

export const oauth2CallbacksRouter = express.Router();

const dappBaseUrl = `${process.env.GIVETH_IO_DAPP_BASE_URL}`;
export const SOCIAL_PROFILES_PREFIX = '/socialProfiles';
const generateDappVerificationUrl = async (params: {
  projectVerificationId: number;
  success: boolean;
  message?: string;
}): Promise<string> => {
  const { projectVerificationId, success, message } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  const address = `${dappBaseUrl}/verification/${projectVerificationForm?.project?.slug}?success=${success}&message=${message}`;
  logger.debug('generateDappVerificationUrl  ', {
    params,
    address,
  });
  return address;
};

oauth2CallbacksRouter.get(
  `/callback/discord`,
  async (request: Request, response: Response) => {
    let projectVerificationId;
    try {
      logger.debug('/callback/discord pramas', {
        query: request.query,
        url: request.url,
        params: request.params,
        originalUrl: request.originalUrl,
        x: request.route,
      });
      const { state, access_token } = request.query;

      if (access_token) {
        const { projectVerificationForm, userId } =
          await getProjectVerificationFormByState({
            socialNetwork: SOCIAL_NETWORKS.DISCORD,
            state: state as string,
          });
        projectVerificationId = projectVerificationForm.id;

        await oauth2CallbackHandler({
          socialNetwork: SOCIAL_NETWORKS.DISCORD,
          userId,
          authorizationCodeOrAccessToken: decodeURI(access_token as string),
          projectVerificationForm,
        });
        response.redirect(
          await generateDappVerificationUrl({
            success: true,
            projectVerificationId,
          }),
        );
      } else {
        // Because discord redirects and pass params as URI_fragment and browser doesnt send it to server
        // So I had to return a html and redirect it to server with passing parameters as query string
        response.setHeader('Content-Type', 'text/html');
        response.send(`
        <div id='info'>Please wait ...</div>
        <a id='login' style='display: none;' href='your-oauth2-URL-here'>Identify Yourself</a>
        <script>
            window.onload = () => {
            const fragment = new URLSearchParams(window.location.hash.slice(1));
            const [accessToken, state] = [fragment.get('access_token'), fragment.get('state')];

            if (!accessToken) {
            return (document.getElementById('login').style.display = 'block');
            }
            console.log('accessToken', accessToken)

            window.open('/socialProfiles/callback/discord?state='+state +'&access_token='+accessToken, '_self')

            };
        </script>
  `);
      }
    } catch (e) {
      logger.error(`/callback/discord error`, { e, projectVerificationId });
      if (projectVerificationId) {
        response.redirect(
          await generateDappVerificationUrl({
            success: false,
            message: e.message,
            projectVerificationId,
          }),
        );
      } else {
        response.redirect(dappBaseUrl);
      }
    }
  },
);

oauth2CallbacksRouter.get(
  `/callback/google`,
  async (request: Request, response: Response) => {
    let projectVerificationId;
    try {
      const { projectVerificationForm, userId } =
        await getProjectVerificationFormByState({
          socialNetwork: SOCIAL_NETWORKS.GOOGLE,
          state: request.query.state as string,
        });
      projectVerificationId = projectVerificationForm.id;

      await oauth2CallbackHandler({
        socialNetwork: SOCIAL_NETWORKS.GOOGLE,
        userId,
        authorizationCodeOrAccessToken: decodeURI(request.query.code as string),
        projectVerificationForm,
      });
      response.redirect(
        await generateDappVerificationUrl({
          success: true,
          projectVerificationId,
        }),
      );
    } catch (e) {
      logger.error(`/callback/discord error`, { e, projectVerificationId });
      if (projectVerificationId) {
        response.redirect(
          await generateDappVerificationUrl({
            success: false,
            message: e.message,
            projectVerificationId,
          }),
        );
      } else {
        response.redirect(dappBaseUrl);
      }
    }
  },
);

oauth2CallbacksRouter.get(
  `/callback/linkedin`,
  async (request: Request, response: Response) => {
    let projectVerificationId;
    try {
      const { projectVerificationForm, userId } =
        await getProjectVerificationFormByState({
          socialNetwork: SOCIAL_NETWORKS.LINKEDIN,
          state: request.query.state as string,
        });
      projectVerificationId = projectVerificationForm.id;

      await oauth2CallbackHandler({
        socialNetwork: SOCIAL_NETWORKS.LINKEDIN,
        userId,
        authorizationCodeOrAccessToken: decodeURI(request.query.code as string),
        projectVerificationForm,
      });
      response.redirect(
        await generateDappVerificationUrl({
          success: true,
          projectVerificationId,
        }),
      );
    } catch (e) {
      logger.error(`/callback/linkedin error`, { e, projectVerificationId });
      if (projectVerificationId) {
        response.redirect(
          await generateDappVerificationUrl({
            success: false,
            message: e.message,
            projectVerificationId,
          }),
        );
      } else {
        response.redirect(dappBaseUrl);
      }
    }
  },
);

oauth2CallbacksRouter.get(
  `/callback/twitter`,
  async (request: Request, response: Response) => {
    let projectVerificationId;
    try {
      const { projectVerificationForm, userId } =
        await getProjectVerificationFormByState({
          socialNetwork: SOCIAL_NETWORKS.TWITTER,
          state: request.query.state as string,
        });
      projectVerificationId = projectVerificationForm.id;

      await oauth2CallbackHandler({
        socialNetwork: SOCIAL_NETWORKS.TWITTER,
        userId,
        authorizationCodeOrAccessToken: decodeURI(request.query.code as string),
        projectVerificationForm,
      });
      response.redirect(
        await generateDappVerificationUrl({
          success: true,
          projectVerificationId,
        }),
      );
    } catch (e) {
      logger.error(`/callback/twitter error`, { e, projectVerificationId });
      if (projectVerificationId) {
        response.redirect(
          await generateDappVerificationUrl({
            success: false,
            message: e.message,
            projectVerificationId,
          }),
        );
      } else {
        response.redirect(dappBaseUrl);
      }
    }
  },
);
