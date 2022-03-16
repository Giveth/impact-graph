import {
  isWalletAddressSmartContract,
  isWalletAddressValid,
  validateProjectWalletAddress,
} from './projectValidator';
import { assert } from 'chai';
import {
  assertThrowsAsync,
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../../test/testUtils';
import { errorMessages } from '../errorMessages';

describe('isWalletAddressValid() test cases', isWalletAddressValidTestCases);

// TODO Write test cases
describe(
  'validateProjectWalletAddress() test cases',
  validateProjectWalletAddressTestCases,
);
// describe('validateProjectTitleForEdit() test cases', validateProjectTitleForEditTestCases);
describe(
  'isWalletAddressSmartContract() test cases',
  isWalletAddressSmartContractTestCases,
);

function isWalletAddressSmartContractTestCases() {
  it('should return true for smart contract address in xdai', async () => {
    // DAI address https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f
    const walletAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const isSmartContract = await isWalletAddressSmartContract(walletAddress);
    assert.isTrue(isSmartContract);
  });
  it('should return true for smart contract address in xdai', async () => {
    // GIV address https://blockscout.com/xdai/mainnet/token/0x4f4F9b8D5B4d0Dc10506e5551B0513B61fD59e75/token-transfers
    const walletAddress = '0x4f4F9b8D5B4d0Dc10506e5551B0513B61fD59e75';
    const isSmartContract = await isWalletAddressSmartContract(walletAddress);
    assert.isTrue(isSmartContract);
  });
}

function validateProjectWalletAddressTestCases() {
  it('should throw exception when address is repetitive', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress(project.walletAddress as string);
    }, `Eth address ${project.walletAddress} is already being used for a project`);
  });

  it('should throw exception when address is repetitive (with difference case, uppercase)', async () => {
    const capitalizedWalletAddress = SEED_DATA.FIRST_PROJECT.walletAddress
      ?.toUpperCase()
      // This replace is because ethereum wallet address should begin with 0x ad toUpperCase make it corrupted
      .replace('0X', '0x') as string;

    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress(capitalizedWalletAddress);
    }, `Eth address ${capitalizedWalletAddress} is already being used for a project`);
  });

  it('should throw exception when address is repetitive (with difference case, lowercase)', async () => {
    const lowercaseAddress =
      SEED_DATA.FIRST_PROJECT.walletAddress?.toLowerCase() as string;

    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress(lowercaseAddress);
    }, `Eth address ${lowercaseAddress} is already being used for a project`);
  });
}
function isWalletAddressValidTestCases() {
  it('should return true for valid address', () => {
    assert.isTrue(
      isWalletAddressValid('0x5AC583Feb2b1f288C0A51d6Cdca2e8c814BFE93B'),
    );
  });
  it('should return false for invalid address', () => {
    assert.isFalse(isWalletAddressValid('0x5AC583Feb2b1f288C0A51B'));
  });
  it('should return false for undefined', () => {
    assert.isFalse(isWalletAddressValid(undefined));
  });
}
