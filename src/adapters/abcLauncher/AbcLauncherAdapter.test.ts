import { AbcLauncherAdapter } from './AbcLauncherAdapter';

describe('ABC Launcher Adapter', () => {
  it('test abc sample', async () => {
    const adapter = new AbcLauncherAdapter();
    const abc = await adapter.getProjectAbcLaunchData(
      '0xF23eA0b5F14afcbe532A1df273F7B233EBe41C78',
    );

    console.log('abc:', abc);
  });

  it.only('test balance', async () => {
    const adapter = new AbcLauncherAdapter();
    const balance = await adapter.ownsNFT(
      '0x46e37D6E86022a1A2b9E6380960130f8e3EB1246',
      '0x46e37D6E86022a1A2b9E6380960130f8e3EB1246',
    );

    console.log(balance);
  });
});
