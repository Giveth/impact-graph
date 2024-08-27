import { IPrivadoAdapter } from './privadoAdapterInterface';

export class PrivadoMockAdapter implements IPrivadoAdapter {
  private _nextIsUserVerified: boolean;

  constructor() {
    this._nextIsUserVerified = true;
  }

  setNextIsUserVerified(isVerified: boolean) {
    this._nextIsUserVerified = isVerified;
  }

  async isUserVerified(_userAddress: string): Promise<boolean> {
    const result = this._nextIsUserVerified;
    this._nextIsUserVerified = true;
    return result;
  }
}
