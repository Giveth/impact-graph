import { Abc } from '../../entities/project';
import { IAbcLauncher } from './AbcLauncherInterface';

export class AbcLauncherAdapterMock implements IAbcLauncher {
  private _nextData: Abc;

  getDefaultData(): Abc {
    return {
      tokenTicker: 'MOCK',
      tokenName: 'Mock Token Name',
      icon: 'moch_icon_hash',
      orchestratorAddress: 'mock_address',
      issuanceTokenAddress: 'mock_issue_address',
      projectAddress: 'mock_project_address',
      creatorAddress: 'mock_creator_address',
      nftContractAddress: 'mock_nft_contract_adddress',
      chainId: 1,
    };
  }

  setNextData(data: Abc) {
    this._nextData = data;
  }

  constructor() {
    this._nextData = this.getDefaultData();
  }

  async getProjectAbcLaunchData(projectAddress: string) {
    const data = this._nextData;
    this._nextData = this.getDefaultData();
    return {
      ...data,
      projectAddress,
    };
  }
}
