import { IsNull, LessThanOrEqual } from 'typeorm';
import moment from 'moment';
import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { logger } from '../utils/logger';
import {
  QACC_DONATION_TOKEN_COINGECKO_ID,
  QACC_PRICE_FETCH_LEAD_TIME_IN_SECONDS,
} from '../constants/qacc';

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
  date = new Date(),
): Promise<EarlyAccessRound | null> => {
  try {
    const query = EarlyAccessRound.createQueryBuilder('earlyAccessRound')
      .where('earlyAccessRound.startDate <= :date', {
        date,
      })
      .andWhere('earlyAccessRound.endDate >= :date', {
        date,
      });

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
  const leadTime = QACC_PRICE_FETCH_LEAD_TIME_IN_SECONDS;

  const roundsToUpdate = await EarlyAccessRound.find({
    where: {
      tokenPrice: IsNull(),
      startDate: LessThanOrEqual(moment().add(leadTime, 'seconds').toDate()),
    },
    select: ['id', 'startDate', 'roundNumber'],
    loadEagerRelations: false,
  });

  // Set the token price for all found rounds and save them
  for (const round of roundsToUpdate) {
    logger.debug(
      `Fetching token price for early round ${round.roundNumber} at date ${round.startDate}`,
    );
    try {
      const tokenPrice = await priceAdapter.getTokenPriceAtDate({
        symbol: QACC_DONATION_TOKEN_COINGECKO_ID,
        date: moment(round.startDate).subtract(leadTime, 'seconds').toDate(),
      });

      if (tokenPrice) {
        logger.debug(
          `Setting token price for early round ${round.roundNumber} to ${tokenPrice}`,
        );
        await EarlyAccessRound.update(round.id, { tokenPrice });
      }
    } catch (error) {
      logger.error(
        `Error fetching token price for early round ${round.roundNumber}`,
        { error },
      );
    }
  }

  return roundsToUpdate.length;
};
