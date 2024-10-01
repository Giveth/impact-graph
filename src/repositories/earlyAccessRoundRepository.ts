import { IsNull, LessThanOrEqual } from 'typeorm';
import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { logger } from '../utils/logger';
import { QACC_DONATION_TOKEN_COINGECKO_ID } from '../constants/qacc';

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
export const findActiveEarlyAccessRound = async (
  currentDate = new Date(),
): Promise<EarlyAccessRound | null> => {
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

  const roundsToUpdate = await EarlyAccessRound.find({
    where: {
      tokenPrice: IsNull(),
      startDate: LessThanOrEqual(new Date()),
    },
    select: ['id', 'startDate', 'roundNumber'],
    loadEagerRelations: false,
  });

  // Set the token price for all found rounds and save them
  for (const round of roundsToUpdate) {
    logger.debug(
      `Fetching token price for early round ${round.roundNumber} at date ${round.startDate}`,
    );
    const tokenPrice = await priceAdapter.getTokenPriceAtDate({
      symbol: QACC_DONATION_TOKEN_COINGECKO_ID,
      date: round.startDate,
    });

    if (tokenPrice) {
      logger.debug(
        `Setting token price for early round ${round.roundNumber} to ${tokenPrice}`,
      );
      await EarlyAccessRound.update(round.id, { tokenPrice });
    }
  }

  return roundsToUpdate.length;
};
