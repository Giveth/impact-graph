import { assert } from 'chai';
import { addNewAnchorAddress } from './anchorContractAddressRepository.js';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils.js';
import { NETWORK_IDS } from '../provider.js';

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
      txHash: generateRandomEvmTxHash(),
    });

    assert.isNotNull(anchorContractAddress);
    assert.equal(anchorContractAddress.address, anchorAddress);
    assert.equal(anchorContractAddress.isActive, true);
    assert.equal(anchorContractAddress.creator.id, creator.id);
    assert.equal(anchorContractAddress.owner.id, projectOwner.id);
  });
}
