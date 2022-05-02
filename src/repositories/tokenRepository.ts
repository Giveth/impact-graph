import { Token } from '../entities/token';

export const findTokenByTokenAddress = async (
  tokenAddress: string,
): Promise<Token | undefined> => {
  return await Token.findOne(tokenAddress);
};
