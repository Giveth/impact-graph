import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { logger } from '../utils/logger';

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
        date: date.toISOString(),
      })
      .andWhere('earlyAccessRound.endDate >= :date', {
        date: date.toISOString(),
      });

    return query.getOne();
  } catch (error) {
    logger.error('Error fetching active Early Access round', { error });
    throw new Error('Error fetching active Early Access round');
  }
};
