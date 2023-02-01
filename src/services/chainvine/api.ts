import { ChainvineClient } from '@chainvine/sdk/lib';

// Initialise the client
export const ChainvineSDK = new ChainvineClient({
  apiKey: process.env.CHAINVINE_API_KEY,
  testMode: process.env.CHAINVINE_API_ENABLE_TEST_MODE, // optional, defaults to false. When set to true, the SDK will use the test API endpoint
});
