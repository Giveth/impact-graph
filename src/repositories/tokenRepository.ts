import { Token } from '../entities/token';

export const findTokenByTokenAddress = async (
  tokenAddress: string,
): Promise<Token | undefined> => {
  return await Token.findOne(tokenAddress);
};
export const findTokenById = async (data: {
  chainId: number;
  token: string;
}) => {
  const { chainId, token } = data;
  const tokenInDb = await Token.findOne({
    networkId: chainId,
    symbol: token,
  });
  return tokenInDb;
};
