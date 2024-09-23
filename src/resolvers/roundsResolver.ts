import { Query, Resolver, ObjectType, Field } from 'type-graphql';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { QfRound } from '../entities/qfRound';
import {
  findActiveEarlyAccessRound,
  findAllEarlyAccessRounds,
} from '../repositories/earlyAccessRoundRepository';
import {
  findActiveQfRound,
  findQfRounds,
} from '../repositories/qfRoundRepository';
import { logger } from '../utils/logger';

@ObjectType()
class ActiveRoundsResponse {
  @Field(_type => EarlyAccessRound, { nullable: true })
  activeEarlyAccessRound?: EarlyAccessRound | null;

  @Field(_type => QfRound, { nullable: true })
  activeQfRound?: QfRound | null;
}

@ObjectType()
class RoundsResponse {
  @Field(_type => [EarlyAccessRound])
  earlyAccessRounds: EarlyAccessRound[];

  @Field(_type => [QfRound])
  qfRounds: QfRound[];
}

@Resolver()
export class RoundsResolver {
  // Fetches all Early Access Rounds and QF Rounds
  @Query(_returns => RoundsResponse, { nullable: true })
  async allRounds(): Promise<RoundsResponse> {
    try {
      const earlyAccessRounds = await findAllEarlyAccessRounds();
      const qfRounds = await findQfRounds({});
      return { earlyAccessRounds, qfRounds };
    } catch (error) {
      logger.error('Error fetching all rounds:', error);
      throw new Error('Could not fetch all rounds.');
    }
  }

  // Fetches the currently active Early Access Round and active QF Rounds
  @Query(_returns => ActiveRoundsResponse, { nullable: true })
  async activeRounds(): Promise<ActiveRoundsResponse> {
    try {
      const activeEarlyAccessRound = await findActiveEarlyAccessRound();
      const activeQfRound = await findActiveQfRound();

      return {
        activeEarlyAccessRound: activeEarlyAccessRound || null,
        activeQfRound: activeQfRound || null,
      };
    } catch (error) {
      logger.error('Error fetching active rounds:', error);
      throw new Error('Could not fetch active rounds.');
    }
  }
}
