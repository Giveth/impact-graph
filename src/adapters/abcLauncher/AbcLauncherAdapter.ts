// a method the get objects from mongodb api read from config DONATION_SAVE_BACKUP_API_URL with sercret read from DONATION_SAVE_BACKUP_API_SECRET,
// it must filter objects by those doesn't have `imported` field with true value
// also must support pagination

import axios from 'axios';
import { logger } from '../../utils/logger';
import config from '../../config';
import { IAbcLauncher } from './AbcLauncherInterface';
import { Abc } from '../../entities/project';

const ABC_LAUNCH_API_URL = config.get('ABC_LAUNCH_API_URL') as string;
const ABC_LAUNCH_API_SECRET = config.get('ABC_LAUNCH_API_SECRET') as string;
const ABC_LAUNCH_DATA_SOURCE = config.get('ABC_LAUNCH_DATA_SOURCE') as string;
const ABC_LAUNCH_COLLECTION = config.get('ABC_LAUNCH_COLLECTION') || 'project';
const ABC_LAUNCH_DATABASE = config.get('ABC_LAUNCH_DATABASE') || 'abc-launcher';

// add '/' if doesn't exist at the
const baseUrl = ABC_LAUNCH_API_URL.endsWith('/')
  ? ABC_LAUNCH_API_URL
  : `${ABC_LAUNCH_API_URL}/`;

export class AbcLauncherAdapter implements IAbcLauncher {
  async getProjectAbcLaunchData(
    projectAddress: string,
  ): Promise<Abc | undefined> {
    try {
      const result = await axios.post(
        `${baseUrl}find`,
        {
          collection: ABC_LAUNCH_COLLECTION,
          database: ABC_LAUNCH_DATABASE,
          dataSource: ABC_LAUNCH_DATA_SOURCE,
          filter: {
            projectAddress: projectAddress.toLocaleLowerCase(),
          },
        },
        {
          headers: {
            'api-key': ABC_LAUNCH_API_SECRET,
            'Content-Type': 'application/json',
            'Access-Control-Request-Headers': '*',
          },
        },
      );

      if (result.status !== 200) {
        logger.error('getNotImportedDonationsFromBackup error', result.data);
        throw new Error(
          'getNotImportedDonationsFromBackup error, status: ' + result.status,
        );
      }
      const data = result.data.documents[0];
      if (!data) return undefined;
      return {
        tokenTicker: data.tokenTicker,
        tokenName: data.tokenName,
        icon: data.iconHash,
        orchestratorAddress: data.orchestratorAddress,
        issuanceTokenAddress: data.issuanceTokenAddress,
        projectAddress: data.projectAddress,
      };
    } catch (e) {
      logger.error('getNotImportedDonationsFromBackup error', e);
      throw e;
    }
  }
}
