import { ChainvineClient } from '@chainvine/sdk/src';

// Initialise the client
export const ChainvineSDK = new ChainvineClient({
  apiKey: process.env.CHAINVINE_API_KEY || '',
  testMode: process.env.CHAINVINE_API_ENABLE_TEST_MODE === 'true', // optional, defaults to false. When set to true, the SDK will use the test API endpoint
});
