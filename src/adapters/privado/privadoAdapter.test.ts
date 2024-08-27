import { assert } from 'chai';
import { PrivadoAdapter } from './privadoAdapter';
import { generateRandomEtheriumAddress } from '../../../test/testUtils';

describe.skip('Provado Adapter Test', () => {
  it('should return a valid true response', async () => {
    // Arrange
    const privadoAdapter = new PrivadoAdapter();
    const userAddress = '0xF3ddEb5022A6F06b61488B48c90315087ca2beef';
    // Act
    const result = await privadoAdapter.isUserVerified(userAddress);
    // Assert
    assert.isTrue(result);
  });

  it('should return a valid false response', async () => {
    // Arrange
    const privadoAdapter = new PrivadoAdapter();
    const userAddress = generateRandomEtheriumAddress();
    // Act
    const result = await privadoAdapter.isUserVerified(userAddress);
    // Assert
    assert.isFalse(result);
  });
});
