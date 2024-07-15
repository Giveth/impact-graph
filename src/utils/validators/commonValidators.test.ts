import { assert } from 'chai';
import { validateEmail } from './commonValidators.js';

describe('validateEmail() test cases', validateEmailTestCases);

function validateEmailTestCases() {
  it('should return true for valid email', () => {
    assert.isTrue(validateEmail('mamad@giveth.io'));
  });

  it('should return false for invalid email', () => {
    assert.isFalse(validateEmail('mamad'));
  });
  it('should return true for invalid email', () => {
    assert.isFalse(validateEmail('mamad @ giveth.io'));
  });
  it('should return true for invalid email', () => {
    assert.isFalse(validateEmail('mamad@'));
  });
}
