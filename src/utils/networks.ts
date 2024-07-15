import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { ChainType } from '../types/network.js';
import networksConfig from './networksConfig.js';

export const SOLANA_SYSTEM_PROGRAM = '11111111111111111111111111111111';

export const isSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address.trim());
    return true;
  } catch (e) {
    return false;
  }
};

export const isEvmAddress = (address: string): boolean => {
  return ethers.utils.isAddress(address);
};

export const detectAddressChainType = (
  address: string,
): ChainType | undefined => {
  switch (true) {
    case isSolanaAddress(address):
      return ChainType.SOLANA;
    case isEvmAddress(address):
      return ChainType.EVM;
    default:
      return undefined;
  }
};

export const buildTxLink = (hash: string, chainId: number): string => {
  const explorerLink = networksConfig[chainId].blockExplorer;
  return `${explorerLink}/tx/${hash}`;
};
