import { ethers } from 'ethers';
import { ChainType } from '../types/network';
import { PublicKey } from '@solana/web3.js';

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
