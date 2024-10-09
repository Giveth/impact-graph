import {
  Query,
  Resolver,
  ObjectType,
  Field,
  createUnionType,
} from 'type-graphql';
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

const RoundUnion = createUnionType({
  name: 'RoundUnion',
  types: () => [EarlyAccessRound, QfRound] as const,
  resolveType: value => {
    if ('startDate' in value) {
      return EarlyAccessRound;
    }
    if ('slug' in value) {
      return QfRound;
    }
    return null;
  },
});

@ObjectType()
class ActiveRoundsResponse {
  @Field(_type => RoundUnion, { nullable: true })
  activeRound?: typeof RoundUnion | null;
}

@Resolver()
export class RoundsResolver {
  @Query(_returns => [RoundUnion], { nullable: true })
  async allRounds(): Promise<Array<typeof RoundUnion>> {
    try {
      const earlyAccessRounds = await findAllEarlyAccessRounds();
      const qfRounds = await findQfRounds({});

      // Combine both arrays into a single array
      return [...earlyAccessRounds, ...qfRounds];
    } catch (error) {
      logger.error('Error fetching all rounds:', error);
      throw new Error('Could not fetch all rounds.');
    }
  }

  @Query(_returns => ActiveRoundsResponse, { nullable: true })
  async activeRound(): Promise<ActiveRoundsResponse> {
    try {
      const activeEarlyAccessRound = await findActiveEarlyAccessRound();
      const activeQfRound = await findActiveQfRound();

      const activeRound = activeEarlyAccessRound || activeQfRound || null;

      return { activeRound };
    } catch (error) {
      logger.error('Error fetching active round:', error);
      throw new Error('Could not fetch active round.');
    }
  }
}
