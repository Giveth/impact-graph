import { errorMessages } from './errorMessages';
import { Token } from '../entities/token';
import { logger } from './logger';

export const findTokenByNetworkAndSymbol = async (
  networkId: number,
  symbol: string,
): Promise<{
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  isGivbackEligible: boolean;
}> => {
  const token = await Token.findOne({
    symbol,
    networkId,
  });
  if (!token) {
    throw new Error(errorMessages.TOKEN_NOT_FOUND);
  }
  return {
    chainId: networkId,
    address: token.address,
    name: token.name,
    decimals: token.decimals,
    isGivbackEligible: token.isGivbackEligible,
    symbol,
  };
};

export const findTokenByNetworkAndAddress = async (
  networkId: number,
  address: string,
): Promise<{
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
}> => {
  const token = await Token.createQueryBuilder('token')
    .where(`lower("address")=lower(:address) and "networkId"=:networkId`, {
      address,
      networkId,
    })
    .getOne();
  if (!token) {
    throw new Error(errorMessages.TOKEN_NOT_FOUND);
  }
  return {
    chainId: networkId,
    address: token.address.toLowerCase(),
    name: token.name,
    decimals: token.decimals,
    symbol: token.symbol,
  };
};
