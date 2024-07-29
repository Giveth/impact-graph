import { Token } from '../entities/token.js';

export const findTokenByTokenAddress = async (
  tokenAddress: string,
): Promise<Token | null> => {
  return Token.createQueryBuilder('token')
    .leftJoinAndSelect('token.organizations', 'organizations')
    .where({
      address: tokenAddress,
    })
    .getOne();
};

export const findTokenByTokenId = async (id: number): Promise<Token | null> => {
  return Token.createQueryBuilder('token')
    .leftJoinAndSelect('token.organizations', 'organizations')
    .where({
      id,
    })
    .getOne();
};
