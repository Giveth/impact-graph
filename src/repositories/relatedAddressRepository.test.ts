import {
  addNewRelatedAddress,
  findProjectRecipientAddressByNetworkId,
  getPurpleListAddresses,
  isWalletAddressInPurpleList,
  removeRelatedAddressOfProject,
} from './relatedAddressRepository';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { assert } from 'chai';
import { NETWORK_IDS } from '../provider';

describe('getPurpleListAddresses test cases', getPurpleListAddressesTestCases);
describe(
  'removeRelatedAddressOfProject test cases',
  removeRelatedAddressOfProjectTestCases,
);
describe('addNewRelatedAddress test cases', addNewRelatedAddressTestCases);
describe(
  'findProjectRecipientAddressByNetworkId test cases',
  findProjectRecipientAddressByNetworkIdTestCases,
);
describe(
  'isWalletAddressInPurpleList test cases',
  isWalletAddressInPurpleListTestCases,
);

function getPurpleListAddressesTestCases() {
  it('should return address of a verified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    const purpleListAddresses = await getPurpleListAddresses();
    assert.isOk(
      purpleListAddresses.find(
        ({ relatedAddress }) => relatedAddress === walletAddress,
      ),
    );
  });
  it('should not return address of a non-verified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: false,
    });
    const purpleListAddresses = await getPurpleListAddresses();
    assert.isNotOk(
      purpleListAddresses.find(
        ({ relatedAddress }) => relatedAddress === walletAddress,
      ),
    );
  });
}
function removeRelatedAddressOfProjectTestCases() {
  it('should return address of a verified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    assert.isTrue(await isWalletAddressInPurpleList(walletAddress));
    assert.isOk(
      await findProjectRecipientAddressByNetworkId({
        projectId: project.id,
        networkId: NETWORK_IDS.XDAI,
      }),
    );
    await removeRelatedAddressOfProject({ project });
    assert.isFalse(await isWalletAddressInPurpleList(walletAddress));
    assert.notOk(
      await findProjectRecipientAddressByNetworkId({
        projectId: project.id,
        networkId: NETWORK_IDS.XDAI,
      }),
    );
  });
  it('should not return address of a non-verified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: false,
    });
    const purpleListAddresses = await getPurpleListAddresses();
    assert.isNotOk(
      purpleListAddresses.find(
        ({ relatedAddress }) => relatedAddress === walletAddress,
      ),
    );
  });
}
function addNewRelatedAddressTestCases() {
  it('should new related address ', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
      admin: String(user.id),
    });
    const newAddress = generateRandomEtheriumAddress();
    const newRelatedAddress = await addNewRelatedAddress({
      address: newAddress,
      networkId: NETWORK_IDS.XDAI,
      project,
      user,
    });
    assert.isOk(newRelatedAddress);
    assert.equal(newRelatedAddress.address, newAddress),
      assert.isFalse(newRelatedAddress.isRecipient);
  });
  it('should not return address of a non-verified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: false,
    });
    const purpleListAddresses = await getPurpleListAddresses();
    assert.isNotOk(
      purpleListAddresses.find(
        ({ relatedAddress }) => relatedAddress === walletAddress,
      ),
    );
  });
}
function findProjectRecipientAddressByNetworkIdTestCases() {
  it('should return recipient address of project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    const recipientAddress = await findProjectRecipientAddressByNetworkId({
      projectId: project.id,
      networkId: NETWORK_IDS.XDAI,
    });
    assert.equal(recipientAddress?.address, walletAddress);
    assert.equal(recipientAddress?.networkId, NETWORK_IDS.XDAI);
    assert.isTrue(recipientAddress?.isRecipient);
  });
}

function isWalletAddressInPurpleListTestCases() {
  it('should return true for address of a verified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    assert.isTrue(await isWalletAddressInPurpleList(walletAddress));
  });
  it('should not return address of a non-verified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: false,
    });
    assert.isFalse(await isWalletAddressInPurpleList(walletAddress));
  });
}
