import { Token } from '../entities/token';

export const findTokenByTokenAddress = async (
  tokenAddress: string,
): Promise<Token | null> => {
  return await Token.findOne({ where: { address: tokenAddress } });
};
