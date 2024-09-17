// a method the get objects from mongodb api read from config DONATION_SAVE_BACKUP_API_URL with sercret read from DONATION_SAVE_BACKUP_API_SECRET,
// it must filter objects by those doesn't have `imported` field with true value
// also must support pagination

import { ethers } from 'ethers';
import { Collection, Db, MongoClient } from 'mongodb';
import { logger } from '../../utils/logger';
import config from '../../config';
import { IAbcLauncher } from './abcLauncherInterface';
import { Abc } from '../../entities/project';
import { getProvider, QACC_NETWORK_ID } from '../../provider';

const ABC_LAUNCH_COLLECTION =
  (config.get('ABC_LAUNCH_COLLECTION') as string) || 'project';
const ABC_LAUNCH_DATABASE =
  (config.get('ABC_LAUNCH_DATABASE') as string) || 'abc-launcher';
const ABC_LAUNCH_DB_CONNECTION_URL = config.get(
  'ABC_LAUNCH_DB_CONNECTION_URL',
) as string;

let mongoClient: MongoClient;
export async function connectToMongo() {
  const url = ABC_LAUNCH_DB_CONNECTION_URL;
  if (!url) {
    throw new Error('MONGODB_CONNECTION_URL is not set');
  }
  if (!mongoClient) {
    mongoClient = new MongoClient(url);
    await mongoClient.connect();
  }
  return mongoClient;
}

export async function getMongoDB(): Promise<Db> {
  const client = await connectToMongo();
  return client.db(ABC_LAUNCH_DATABASE);
}
export class AbcLauncherAdapter implements IAbcLauncher {
  async getProjectAbcLaunchData(projectAddress: string): Promise<Abc | null> {
    try {
      const db = await getMongoDB();
      const projectCollection: Collection = db.collection(
        ABC_LAUNCH_COLLECTION,
      );
      const abc = await projectCollection.findOne({
        projectAddress: projectAddress.toLocaleLowerCase(),
      });

      return (
        abc && {
          tokenTicker: abc.tokenTicker,
          tokenName: abc.tokenName,
          icon: abc.iconHash,
          orchestratorAddress: abc.orchestratorAddress,
          issuanceTokenAddress: abc.issuanceTokenAddress,
          fundingManagerAddress: abc.fundingManagerAddress,
          projectAddress: abc.projectAddress,
          creatorAddress: abc.userAddress,
          nftContractAddress: abc.nftContractAddress,
          chainId: abc.chainId,
        }
      );
    } catch (e) {
      logger.error(`get abc of project address ${projectAddress} error `, e);
      throw e;
    }
  }

  async ownsNFT(
    nftContractAddress: string,
    userAddress: string,
  ): Promise<boolean> {
    const provider = getProvider(QACC_NETWORK_ID);
    // Only balanceOf method is enough`
    const abi = [
      {
        inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ];

    const contract = new ethers.Contract(nftContractAddress, abi, provider);
    const balance = await contract.balanceOf(userAddress);
    return balance > 0;
  }
}
