import { assert } from 'chai';
import { ethers } from 'ethers';
import {
  getBlockExplorerApiUrl,
  getNetworkNameById,
  getNetworkNativeToken,
  getProvider,
  NETWORK_IDS,
  NETWORKS_IDS_TO_NAME,
} from '../provider';
import { buildTxLink } from './networks';

const ROBINHOOD_CHAIN_MAINNET_ID = 4663;
const ROBINHOOD_CHAIN_TESTNET_ID = 46630;

describe('Robinhood Chain - NETWORK_IDS', () => {
  it('should have Robinhood Chain mainnet id 4663', () => {
    assert.equal(
      NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET,
      ROBINHOOD_CHAIN_MAINNET_ID,
    );
  });
  it('should have Robinhood Chain testnet id 46630', () => {
    assert.equal(
      NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET,
      ROBINHOOD_CHAIN_TESTNET_ID,
    );
  });
});

describe('Robinhood Chain - NETWORKS_IDS_TO_NAME', () => {
  it('should map 4663 to ROBINHOOD_CHAIN_MAINNET', () => {
    assert.equal(
      NETWORKS_IDS_TO_NAME[ROBINHOOD_CHAIN_MAINNET_ID],
      'ROBINHOOD_CHAIN_MAINNET',
    );
  });
  it('should map 46630 to ROBINHOOD_CHAIN_TESTNET', () => {
    assert.equal(
      NETWORKS_IDS_TO_NAME[ROBINHOOD_CHAIN_TESTNET_ID],
      'ROBINHOOD_CHAIN_TESTNET',
    );
  });
});

describe('Robinhood Chain - ' + getNetworkNameById.name, () => {
  it('should return network name for mainnet', () => {
    assert.equal(
      getNetworkNameById(ROBINHOOD_CHAIN_MAINNET_ID),
      'Robinhood Chain Mainnet',
    );
  });
  it('should return network name for testnet', () => {
    assert.equal(
      getNetworkNameById(ROBINHOOD_CHAIN_TESTNET_ID),
      'Robinhood Chain Testnet',
    );
  });
});

describe('Robinhood Chain - ' + getNetworkNativeToken.name, () => {
  it('should return ETH as native token for mainnet', () => {
    assert.equal(getNetworkNativeToken(ROBINHOOD_CHAIN_MAINNET_ID), 'ETH');
  });
  it('should return ETH as native token for testnet', () => {
    assert.equal(getNetworkNativeToken(ROBINHOOD_CHAIN_TESTNET_ID), 'ETH');
  });
});

describe('Robinhood Chain - ' + getProvider.name, () => {
  it('should return a JsonRpcProvider for mainnet with the configured RPC url', () => {
    const provider = getProvider(ROBINHOOD_CHAIN_MAINNET_ID);
    assert.instanceOf(provider, ethers.providers.JsonRpcProvider);
    assert.equal(
      provider.connection.url,
      process.env.ROBINHOOD_CHAIN_NODE_HTTP_URL,
    );
  });
  it('should return a JsonRpcProvider for testnet with the configured RPC url', () => {
    const provider = getProvider(ROBINHOOD_CHAIN_TESTNET_ID);
    assert.instanceOf(provider, ethers.providers.JsonRpcProvider);
    assert.equal(
      provider.connection.url,
      process.env.ROBINHOOD_CHAIN_TESTNET_NODE_HTTP_URL,
    );
  });
});

describe('Robinhood Chain - ' + getBlockExplorerApiUrl.name, () => {
  it('should return the Etherscan V2 url with the shared api key appended for mainnet', () => {
    const apiUrl = getBlockExplorerApiUrl(ROBINHOOD_CHAIN_MAINNET_ID);
    assert.equal(
      apiUrl,
      `${process.env.ROBINHOOD_CHAIN_SCAN_API_URL}&apikey=${process.env.ETHERSCAN_API_KEY}`,
    );
    assert.include(apiUrl, '&apikey=');
  });
  it('should return the bare Blockscout url with no api key appended for testnet', () => {
    const apiUrl = getBlockExplorerApiUrl(ROBINHOOD_CHAIN_TESTNET_ID);
    assert.equal(apiUrl, process.env.ROBINHOOD_CHAIN_TESTNET_SCAN_API_URL);
    assert.notInclude(apiUrl, 'apikey');
  });
});

describe('Robinhood Chain - ' + buildTxLink.name, () => {
  const txHash =
    '0x7ebbc3d0b4c2c4d225a17079989dcc893d610c910be08cfb9068225441f95f76';
  it('should build a tx link for mainnet', () => {
    assert.equal(
      buildTxLink(txHash, ROBINHOOD_CHAIN_MAINNET_ID),
      `https://robin.etherscan.io//tx/${txHash}`,
    );
  });
  it('should build a tx link for testnet', () => {
    assert.equal(
      buildTxLink(txHash, ROBINHOOD_CHAIN_TESTNET_ID),
      `https://explorer.testnet.chain.robinhood.com//tx/${txHash}`,
    );
  });
});
