import { Abc } from '../../entities/project';

export interface IAbcLauncher {
  getProjectAbcLaunchData(projectAddress: string): Promise<Abc | null>;
  ownsNFT(nftContractAddress: string, userAddress: string): Promise<boolean>;
}
