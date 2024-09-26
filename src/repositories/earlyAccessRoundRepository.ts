import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { logger } from '../utils/logger';
import { AppDataSource } from '../orm';
import { QACC_DONATION_TOKEN_COINGECKO_ID } from '../utils/qacc';

export const findAllEarlyAccessRounds = async (): Promise<
  EarlyAccessRound[]
> => {
  try {
    return EarlyAccessRound.createQueryBuilder('earlyAccessRound')
      .orderBy('earlyAccessRound.startDate', 'ASC')
      .getMany();
  } catch (error) {
    logger.error('Error fetching all Early Access rounds', { error });
    throw new Error('Error fetching Early Access rounds');
  }
};

// Find the currently active Early Access Round
export const findActiveEarlyAccessRound =
  async (): Promise<EarlyAccessRound | null> => {
    const currentDate = new Date();

    try {
      const query = EarlyAccessRound.createQueryBuilder('earlyAccessRound')
        .where('earlyAccessRound.startDate <= :currentDate', { currentDate })
        .andWhere('earlyAccessRound.endDate >= :currentDate', { currentDate });

      return query.getOne();
    } catch (error) {
      logger.error('Error fetching active Early Access round', { error });
      throw new Error('Error fetching active Early Access round');
    }
  };

export const fillMissingTokenPriceInEarlyAccessRounds = async (): Promise<
  void | number
> => {
  const priceAdapter = new CoingeckoPriceAdapter();

  // Find all EarlyAccessRound where token_price is NULL
  const roundsToUpdate = await AppDataSource.getDataSource()
    .getRepository(EarlyAccessRound)
    .createQueryBuilder('early_AccessRound')
    .where('early_AccessRound.tokenPrice IS NULL')
    .andWhere('early_AccessRound.startDate < :now', { now: new Date() })
    .getMany();

  // Set the token price for all found rounds and save them
  for (const round of roundsToUpdate) {
    const tokenPrice = await priceAdapter.getTokenPriceAtDate({
      symbol: QACC_DONATION_TOKEN_COINGECKO_ID,
      date: round.startDate,
    });

    if (tokenPrice) {
      round.tokenPrice = tokenPrice;
      await AppDataSource.getDataSource()
        .getRepository(EarlyAccessRound)
        .save(round);
    }
  }

  return roundsToUpdate.length;
};
