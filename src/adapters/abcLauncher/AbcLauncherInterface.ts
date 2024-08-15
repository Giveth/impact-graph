import { Abc } from '../../entities/project';

// export type AbcLaunchData = {
//   tokenName: string;
//   tokenTicker: string;
//   iconHash: string;
//   projectAddress: string;
//   transactionHash: string;
//   orchestratorAddress: string;
// };

export interface IAbcLauncher {
  getProjectAbcLaunchData(projectAddress: string): Promise<Abc | undefined>;
}
