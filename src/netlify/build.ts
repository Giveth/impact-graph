import config from '../config';
import axios from 'axios';
import SentryLogger from '../sentryLogger';
import { redis } from '../redis';
import { logger } from '../utils/logger';

const deployHook = config.get('NETLIFY_DEPLOY_HOOK');
const environment = config.get('ENVIRONMENT');

const netlifyUrl = `https://api.netlify.com/build_hooks/${deployHook}`;

async function isNetlifyDeploying() {
  return false;
  const redisNetlifyIsDeploying = await redis.get(
    'impact-graph:netlifyDeploy:isDeploying',
  );
  logger.debug(`redisNetlifyIsDeploying ! ---> : ${redisNetlifyIsDeploying}`);
  return redisNetlifyIsDeploying === null ||
    redisNetlifyIsDeploying === '' ||
    redisNetlifyIsDeploying === 'false'
    ? false
    : true;
}
export async function triggerBuild(projectId) {
  try {
    if (
      deployHook &&
      (environment === 'staging' || environment === 'production')
    ) {
      const projectsToDeployRedis = await redis.get(
        'impact-graph:netlifyDeploy:projects:toDeploy',
      );
      const projectsToDeploy = projectsToDeployRedis
        ? projectsToDeployRedis.split(',')
        : [];

      projectsToDeploy.push(projectId);

      const netlifyIsDeploying = await isNetlifyDeploying();
      logger.debug(`netlifyIsDeploying ---> : ${netlifyIsDeploying}`);
      if (!netlifyIsDeploying) {
        await redis.set(
          'impact-graph:netlifyDeploy:projects:deploying',
          projectsToDeploy.join(','),
          'ex',
          60 * 60 * 24,
        ); // 1 day expiration
        await redis.set('impact-graph:netlifyDeploy:isDeploying', 'true');
        logger.debug('Calling netlify webhook');
        logger.debug(
          `projectsToDeploy : ${JSON.stringify(projectsToDeploy, null, 2)}`,
        );

        logger.debug(`Posting to netlifyUrl ---> : ${netlifyUrl}`);
        const response: any = await axios.post(netlifyUrl, {});
        logger.debug(
          `response.data : ${JSON.stringify(response.data, null, 2)}`,
        );
      } else {
        await redis.set(
          'impact-graph:netlifyDeploy:projects:toDeploy',
          projectsToDeploy.join(','),
          'ex',
          60 * 60 * 24,
        ); // 1 day expiration
      }
    }
  } catch (e) {
    SentryLogger.captureException(e);
    logger.error(`Error while triggering rebuild`, e);
  }
}
// triggerBuild(1)
export function notifyDiscord() {
  /**
   *
   * post
   * https://discord.com/api/webhooks/808058993708236821/OxjnuZyCHcqYydtLXNCyriwb7K6iNcde2RSHMam5ndtnpH96D4-XRNv-wkfQL9LT1frk
   *

  {
    "name": "test webhook",
    "type": 1,
    "channel_id": "199737254929760256",
    "token": "3d89bb7572e0fb30d8128367b3b1b44fecd1726de135cbe28a41f8b2f777c372ba2939e72279b94526ff5d1bd4358d65cf11",
    "avatar": null,
    "guild_id": "199737254929760256",
    "id": "223704706495545344",
    "user": {
      "username": "test",
      "discriminator": "7479",
      "id": "190320984123768832",
      "avatar": "b004ec1740a63ca06ae2e14c5cee11f3"
    }
  } */
}
