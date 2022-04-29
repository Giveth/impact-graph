import { Token } from '../entities/token';

export const findTokenByTokenAddres = async (tokenAddress): Promise<Token> => {
  return await Token.findOne(tokenAddress);
};
