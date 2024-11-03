import { assert } from 'chai';
import {
  isWalletAddressSmartContract,
  isWalletAddressValid,
  validateProjectTitle,
  validateProjectWalletAddress,
} from './projectValidator';
import {
  assertThrowsAsync,
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomSolanaAddress,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../../test/testUtils';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../errorMessages';
import { ChainType } from '../../types/network';

describe('isWalletAddressValid() test cases', isWalletAddressValidTestCases);

// TODO Write test cases
describe(
  'validateProjectWalletAddress() test cases',
  validateProjectWalletAddressTestCases,
);
// describe('validateProjectTitleForEdit() test cases', validateProjectTitleForEditTestCases);
describe('validateProjectTitleTestCases', validateProjectTitleTestCases);
describe.skip(
  'isWalletAddressSmartContract() test cases',
  isWalletAddressSmartContractTestCases,
);

function validateProjectTitleTestCases() {
  it('should return an english message if title is invalid with including ()', async () => {
    try {
      await validateProjectTitle('fdf()');
    } catch (e) {
      assert.equal(
        e.message,
        i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_TITLE),
      );
    }
  });

  it('should return true for special characters', async () => {
    assert.isTrue(
      await validateProjectTitle(`test1234567890?!@#$%^&*+=._|/<">'-` + '`/'),
    );
  });
}

function isWalletAddressSmartContractTestCases() {
  it('should return true for smart contract address in mainnet', async () => {
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
  it('should return true for smart contract address in polygon', async () => {
    // GIV address https://polygonscan.com/address/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270
    const walletAddress = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';
    const isSmartContract = await isWalletAddressSmartContract(walletAddress);
    assert.isTrue(isSmartContract);
  });
  it('should return true for smart contract address in celo', async () => {
    const walletAddress = '0x67316300f17f063085Ca8bCa4bd3f7a5a3C66275';
    const isSmartContract = await isWalletAddressSmartContract(walletAddress);
    assert.isTrue(isSmartContract);
  });
  it('should return true for smart contract address in celo alfajores', async () => {
    const walletAddress = '0x17bc3304F94c85618c46d0888aA937148007bD3C';
    const isSmartContract = await isWalletAddressSmartContract(walletAddress);
    assert.isTrue(isSmartContract);
  });
  it('should return true for smart contract address in arbitrum mainnet', async () => {
    const walletAddress = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    const isSmartContract = await isWalletAddressSmartContract(walletAddress);
    assert.isTrue(isSmartContract);
  });
  it('should return true for smart contract address in arbitrum sepolia', async () => {
    const walletAddress = '0x6b7860b66c0124e8d8c079b279c126ce58c442a2';
    const isSmartContract = await isWalletAddressSmartContract(walletAddress);
    assert.isTrue(isSmartContract);
  });
}

function validateProjectWalletAddressTestCases() {
  it('should throw exception when address is repetitive', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress(project.walletAddress as string);
    }, `Address ${project.walletAddress} is already being used for a project`);
  });

  it('should throw exception when address is repetitive (with difference case, uppercase)', async () => {
    const capitalizedWalletAddress = SEED_DATA.FIRST_PROJECT.walletAddress
      ?.toUpperCase()
      // This replace is because ethereum wallet address should begin with 0x ad toUpperCase make it corrupted
      .replace('0X', '0x') as string;

    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress(capitalizedWalletAddress);
    }, `Address ${capitalizedWalletAddress} is already being used for a project`);
  });

  it('should throw exception when address is repetitive (with difference case, lowercase)', async () => {
    const lowercaseAddress =
      SEED_DATA.FIRST_PROJECT.walletAddress?.toLowerCase() as string;

    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress(lowercaseAddress);
    }, `Address ${lowercaseAddress} is already being used for a project`);
  });

  it('should throw exception when address is not valid - Ethereum', async () => {
    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress('0x34234234f');
    }, errorMessages.INVALID_WALLET_ADDRESS);
    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress(SEED_DATA.MALFORMED_ETHEREUM_ADDRESS);
    }, errorMessages.INVALID_WALLET_ADDRESS);
    await saveProjectDirectlyToDb(createProjectData());
  });
  it('should throw exception when address is not valid - Solana', async () => {
    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress(SEED_DATA.MALFORMED_SOLANA_ADDRESS);
    }, errorMessages.INVALID_WALLET_ADDRESS);

    const project = await saveProjectDirectlyToDb(createProjectData());

    await assertThrowsAsync(async () => {
      await validateProjectWalletAddress(
        SEED_DATA.MALFORMED_SOLANA_ADDRESS,
        project.id,
        ChainType.SOLANA,
      );
    }, errorMessages.INVALID_WALLET_ADDRESS);
  });

  it('should return true for valid address - Ethereum', async () => {
    const valid = await validateProjectWalletAddress(
      generateRandomEtheriumAddress(),
    );
    assert.isTrue(valid);
  });

  it('should return true for valid address - Solana', async () => {
    const valid = await validateProjectWalletAddress(
      generateRandomSolanaAddress(),
    );
    assert.isTrue(valid);
  });
}
function isWalletAddressValidTestCases() {
  it('should return true for valid address', () => {
    assert.isTrue(
      isWalletAddressValid('0x5AC583Feb2b1f288C0A51d6Cdca2e8c814BFE93B'),
    );
  });
  it('should return true for valid address - chainType defined', () => {
    assert.isTrue(
      isWalletAddressValid(
        '0x5AC583Feb2b1f288C0A51d6Cdca2e8c814BFE93B',
        ChainType.EVM,
      ),
    );
  });
  it('should return false for valid Ethereum address when chainType is wrong', () => {
    assert.isFalse(
      isWalletAddressValid(
        '0x5AC583Feb2b1f288C0A51d6Cdca2e8c814BFE93B',
        ChainType.SOLANA,
      ),
    );
  });
  it('should return false for valid Solana address when chainType is wrong', () => {
    assert.isFalse(
      isWalletAddressValid(
        'ALuY9D3XDhNgJvKQavNcLS6qZ9oGP4mUWRvnerWXxgML',
        ChainType.EVM,
      ),
    );
  });
  it('should return false for invalid address', () => {
    assert.isFalse(isWalletAddressValid('0x5AC583Feb2b1f288C0A51B'));
  });
  it('should return false for undefined', () => {
    assert.isFalse(isWalletAddressValid(undefined));
  });
  it('should return true for valid solana address', () => {
    assert.isTrue(
      isWalletAddressValid('7Qg4Nj7y6YV1iRQ6jQZn7hLQ7L4r1L7Xb1Y7JZrR9Q7g'),
    );
  });
  it('should return true for valid solana address - chainType defined', () => {
    assert.isTrue(
      isWalletAddressValid(
        '7Qg4Nj7y6YV1iRQ6jQZn7hLQ7L4r1L7Xb1Y7JZrR9Q7g',
        ChainType.SOLANA,
      ),
    );
  });
}
