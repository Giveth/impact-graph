import { Field, ObjectType, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import {
  findActiveEarlyAccessRound,
  findAllEarlyAccessRounds,
} from '../repositories/earlyAccessRoundRepository';
import { logger } from '../utils/logger';

@Service()
@ObjectType()
class EarlyAccessRoundResponse {
  @Field()
  roundNumber: number;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@Resolver(_of => EarlyAccessRound)
export class EarlyAccessRoundResolver {
  // Fetches all Early Access Rounds
  @Query(_returns => [EarlyAccessRoundResponse], { nullable: true })
  async allEarlyAccessRounds(): Promise<EarlyAccessRound[]> {
    try {
      return await findAllEarlyAccessRounds();
    } catch (error) {
      logger.error('Error fetching all Early Access Rounds:', error);
      throw new Error('Could not fetch all Early Access Rounds.');
    }
  }

  // Fetches the currently active Early Access Round
  @Query(_returns => EarlyAccessRoundResponse, { nullable: true })
  async activeEarlyAccessRound(): Promise<EarlyAccessRound | null> {
    try {
      const activeRound = await findActiveEarlyAccessRound();
      return activeRound || null;
    } catch (error) {
      logger.error('Error fetching active Early Access Round:', error);
      throw new Error('Could not fetch active Early Access Round.');
    }
  }
}
