import { Token } from '../entities/token';

export const findTokenByTokenAddres = async (
  tokenAddress: string,
): Promise<Token | undefined> => {
  return await Token.findOne(tokenAddress);
};
