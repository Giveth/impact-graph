import { Token } from '../entities/token';

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
