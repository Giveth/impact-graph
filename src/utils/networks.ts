import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { StrKey } from '@stellar/stellar-sdk';
import {
  Address,
  ByronAddress,
} from '@emurgo/cardano-serialization-lib-nodejs';
import { ChainType } from '../types/network';
import networksConfig from './networksConfig';

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

export const isStellarAddress = (address: string): boolean =>
  StrKey.isValidEd25519PublicKey(address.trim());

export const isCardanoAddress = (address: string): boolean => {
  // Check for stake addresses by prefix (stake1..., stake_test1...)
  if (address.startsWith('stake1') || address.startsWith('stake_test1')) {
    // Basic validation: should be bech32-like format
    // Stake addresses are typically around 59 characters long
    return (
      address.length >= 50 &&
      address.length <= 70 &&
      /^[a-z0-9]+$/.test(address)
    );
  }

  // Try Shelley-era bech32 payment addresses (addr1..., addr_test1...)
  try {
    Address.from_bech32(address);
    return true;
  } catch {
    // Not a payment address → maybe Byron-era base58
  }

  // Try Byron-era base58 (Ae2..., DdzFF...)
  try {
    ByronAddress.from_base58(address);
    return true;
  } catch {
    return false;
  }
};

export const detectAddressChainType = (
  address: string,
): ChainType | undefined => {
  switch (true) {
    case isSolanaAddress(address):
      return ChainType.SOLANA;
    case isEvmAddress(address):
      return ChainType.EVM;
    case isStellarAddress(address):
      return ChainType.STELLAR;
    case isCardanoAddress(address):
      return ChainType.CARDANO;
    default:
      return undefined;
  }
};

export const buildTxLink = (hash: string, chainId: number): string => {
  const explorerLink = networksConfig[chainId].blockExplorer;
  return `${explorerLink}/tx/${hash}`;
};
