import { addNewAnchorAddress } from './anchorContractAddressRepository';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { NETWORK_IDS } from '../provider';
import { assert } from 'chai';

describe('addNewAnchorAddressTestCases', addNewAnchorAddressTestCases);

function addNewAnchorAddressTestCases() {
  it('should create anchorAddress successfully', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const creator = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const anchorAddress = generateRandomEtheriumAddress();

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator,
      address: anchorAddress,
      networkId: NETWORK_IDS.OPTIMISTIC,
    });

    assert.isNotNull(anchorContractAddress);
    assert.equal(anchorContractAddress.address, anchorAddress);
    assert.equal(anchorContractAddress.isActive, true);
    assert.equal(anchorContractAddress.creator.id, creator.id);
    assert.equal(anchorContractAddress.owner.id, projectOwner.id);
  });
}
