import { Abc } from '../../entities/project';

export interface IAbcLauncher {
  getProjectAbcLaunchData(projectAddress: string): Promise<Abc | undefined>;
}
