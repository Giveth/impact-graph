import { isWalletAddressValid } from './projectValidator';
import { assert } from 'chai';

// TODO add test cases for isWalletAddressSmartContract(), validateProjectWalletAddress() in the future
const isWalletAddressValidTestCases = () => {
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
};
describe('isWalletAddressValid() test cases', isWalletAddressValidTestCases);
