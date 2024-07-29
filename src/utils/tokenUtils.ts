import { i18n, translationErrorMessagesKeys } from './errorMessages.js';
import { Token } from '../entities/token.js';

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
    where: {
      symbol,
      networkId,
    },
    cache: { id: `token_${networkId}_${symbol}`, milliseconds: 1000 * 60 * 60 },
  });
  if (!token) {
    throw new Error(i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND));
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
    .cache(`token_${networkId}_${address}`, 1000 * 60 * 60)
    .getOne();
  if (!token) {
    throw new Error(i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND));
  }
  return {
    chainId: networkId,
    address: token.address.toLowerCase(),
    name: token.name,
    decimals: token.decimals,
    symbol: token.symbol,
  };
};

export const sortTokensByOrderAndAlphabets = (tokens: Token[]): Token[] => {
  // First sort alphabetically
  tokens.sort((firstToken, secondToken) => {
    if (firstToken.symbol.toLowerCase() < secondToken.symbol.toLowerCase()) {
      return -1;
    }
    if (firstToken.symbol.toLowerCase() > secondToken.symbol.toLowerCase()) {
      return 1;
    }
    return 0;
  });

  // Finally sort by order if exists
  tokens.sort((firstToken, secondToken) => {
    if (!firstToken.order) {
      return 1;
    }
    if (!secondToken.order) {
      return -1;
    }
    return firstToken.order - secondToken.order;
  });
  return tokens;
};
