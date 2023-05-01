import { PowerBoosting } from '../entities/powerBoosting';
import { InstantPowerBalance } from '../entities/instantPowerBalance';
import { updateInstancePowerBalances } from './instantBoostingServices';
import { InstantPowerFetchState } from '../entities/instantPowerFetchState';

describe('fetchUpdatedInstantPowerBalances test cases', () => {
  // TODO: Write test cases
});

describe('fillMissingInstantPowerBalances test cases', () => {
  // TODO: Write test cases
});

describe('updateInstancePowerBalances test cases', () => {
  // TODO: Write test cases
});

function updateInstancePowerBalancesTestCase() {
  beforeEach(async () => {
    await PowerBoosting.clear();
    await InstantPowerBalance.clear();
    await InstantPowerFetchState.clear();
  });
  it('should not throw error on intact data', async () => {
    await updateInstancePowerBalances();
  });
}
