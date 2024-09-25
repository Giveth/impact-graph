import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { logger } from '../utils/logger';
import { AppDataSource } from '../orm';

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

export const fillMissingTokenPriceInQfRounds = async (): Promise<
  void | number
> => {
  const priceAdapter = new CoingeckoPriceAdapter();

  // Find all EarlyAccessRound where token_price is NULL
  const roundsToUpdate = await AppDataSource.getDataSource()
    .getRepository(EarlyAccessRound)
    .createQueryBuilder('early_AccessRound')
    .where('early_AccessRound.token_price IS NULL')
    .andWhere('early_AccessRound.startDate > :now', { now: new Date() })
    .getMany();

  if (roundsToUpdate.length === 0) {
    return;
  }

  // Set the token price for all found rounds and save them
  for (const round of roundsToUpdate) {
    const formattedDate = round.startDate
      .toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      .replace(/\//g, '-');

    const tokenPrice = await priceAdapter.getTokenPriceAtDate({
      symbol: 'polygon-ecosystem-token',
      date: formattedDate,
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
