import { assert } from 'chai';
import { AbcLauncherAdapter } from './abcLauncherAdapter';
import { generateRandomEtheriumAddress } from '../../../test/testUtils';

describe('abcLauncherAdapter test cases', abcLauncherAdapterTestCases);

function abcLauncherAdapterTestCases() {
  it.skip('should return abc when project address is valid', async () => {
    const adapter = new AbcLauncherAdapter();
    const userAddress =
      '0x0000000000000000000000000000000000000000'.toLocaleLowerCase();

    const abc = await adapter.getProjectAbcLaunchData(userAddress);

    assert.isOk(abc);
    assert.equal(abc?.projectAddress, userAddress);
  });

  it.skip('should return undefined when project address is invalid', async () => {
    const adapter = new AbcLauncherAdapter();
    const userAddress = generateRandomEtheriumAddress();

    const abc = await adapter.getProjectAbcLaunchData(userAddress);

    assert.isNull(abc);
  });
}
