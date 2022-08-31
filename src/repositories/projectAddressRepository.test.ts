import {
  addBulkNewProjectAddress,
  addNewProjectAddress,
  findAllRelatedAddressByWalletAddress,
  findProjectRecipientAddressByNetworkId,
  findProjectRecipientAddressByProjectId,
  findRelatedAddressByWalletAddress,
  getPurpleListAddresses,
  isWalletAddressInPurpleList,
  removeRecipientAddressOfProject,
} from './projectAddressRepository';
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
describe('addNewProjectAddress test cases', addNewProjectAddressTestCases);
describe(
  'addBulkNewProjectAddress test cases',
  addBulkNewProjectAddressTestCases,
);
describe(
  'findProjectRecipientAddressByNetworkId test cases',
  findProjectRecipientAddressByNetworkIdTestCases,
);
describe(
  'findProjectRecipientAddressByProjectId test cases',
  findProjectRecipientAddressByProjectIdTestCases,
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
        ({ projectAddress }) => projectAddress === walletAddress,
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
        ({ projectAddress }) => projectAddress === walletAddress,
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
    await removeRecipientAddressOfProject({ project });
    assert.isFalse(await isWalletAddressInPurpleList(walletAddress));
    assert.notOk(
      await findProjectRecipientAddressByNetworkId({
        projectId: project.id,
        networkId: NETWORK_IDS.XDAI,
      }),
    );
  });
  it('should delete recipient addresses sucessfully', async () => {
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
    await removeRecipientAddressOfProject({ project });
    const addresses = await findAllRelatedAddressByWalletAddress(
      project.walletAddress as string,
    );
    assert.isEmpty(addresses);
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
        ({ projectAddress }) => projectAddress === walletAddress,
      ),
    );
  });
}
function addNewProjectAddressTestCases() {
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
    const newRelatedAddress = await addNewProjectAddress({
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
        ({ projectAddress }) => projectAddress === walletAddress,
      ),
    );
  });
}
function addBulkNewProjectAddressTestCases() {
  it('should add one related address ', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
      admin: String(user.id),
    });
    const newAddress = generateRandomEtheriumAddress();
    await addBulkNewProjectAddress([
      {
        address: newAddress,
        networkId: NETWORK_IDS.XDAI,
        project,
        user,
      },
    ]);
    const newRelatedAddress = await findRelatedAddressByWalletAddress(
      newAddress,
    );
    assert.isOk(newRelatedAddress);
    assert.equal(newRelatedAddress?.address, newAddress);
    assert.isFalse(newRelatedAddress?.isRecipient);
  });
  it('should add two related address ', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
      admin: String(user.id),
    });
    const newAddress1 = generateRandomEtheriumAddress();
    const newAddress2 = generateRandomEtheriumAddress();
    await addBulkNewProjectAddress([
      {
        address: newAddress1,
        networkId: NETWORK_IDS.XDAI,
        project,
        user,
      },
      {
        address: newAddress2,
        networkId: NETWORK_IDS.XDAI,
        project,
        user,
      },
    ]);
    const newRelatedAddress1 = await findRelatedAddressByWalletAddress(
      newAddress1,
    );
    assert.isOk(newRelatedAddress1);
    assert.equal(newRelatedAddress1?.address, newAddress1);
    assert.equal(newRelatedAddress1?.project?.id, project.id);
    assert.isFalse(newRelatedAddress1?.isRecipient);
    const newRelatedAddress2 = await findRelatedAddressByWalletAddress(
      newAddress2,
    );
    assert.isOk(newRelatedAddress2);
    assert.equal(newRelatedAddress2?.address, newAddress2);
    assert.equal(newRelatedAddress2?.project?.id, project.id);
    assert.isFalse(newRelatedAddress2?.isRecipient);
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
function findProjectRecipientAddressByProjectIdTestCases() {
  it('should return recipient address of project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    const recipientAddress = await findProjectRecipientAddressByProjectId({
      projectId: project.id,
    });
    assert.equal(recipientAddress[0].address, walletAddress);
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
