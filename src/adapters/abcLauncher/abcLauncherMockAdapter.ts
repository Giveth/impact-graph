import { Abc } from '../../entities/project';
import { IAbcLauncher } from './abcLauncherInterface';

export class AbcLauncherMockAdapter implements IAbcLauncher {
  private _nextAbcData: Abc;
  private _nextOwnNFT: boolean;

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

  setAbcNextData(data: Abc) {
    this._nextAbcData = data;
  }

  setNextOwnNFT(ownsNft: boolean) {
    this._nextOwnNFT = ownsNft;
  }

  constructor() {
    this._nextAbcData = this.getDefaultData();
    this._nextOwnNFT = true;
  }

  async getProjectAbcLaunchData(projectAddress: string) {
    const data = this._nextAbcData;
    this._nextAbcData = this.getDefaultData();
    return {
      ...data,
      projectAddress,
    };
  }

  async ownsNFT(
    _nftContractAddress: string,
    _userAddress: string,
  ): Promise<boolean> {
    const result = this._nextOwnNFT;
    this._nextOwnNFT = true;
    return result;
  }
}
