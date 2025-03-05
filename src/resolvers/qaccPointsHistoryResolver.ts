import {
  Arg,
  Field,
  Float,
  Int,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { User } from '../entities/user';
import { Donation } from '../entities/donation';
import { QaccPointsHistory } from '../entities/qaccPointsHistory';

@ObjectType()
export class QaccPointsHistoryResponse {
  @Field(_type => Float)
  pointsEarned: number;

  @Field(_type => Date)
  createdAt: Date;

  @Field(_type => User)
  user: User;

  @Field(_type => Donation, { nullable: true })
  donation?: Donation;
}
@Resolver()
export class QaccPointsHistoryResolver {
  @Query(_returns => [QaccPointsHistoryResponse])
  async getQaccPointsHistory(
    @Arg('userId', _type => Int, { nullable: false }) userId: number,
  ) {
    const history = await QaccPointsHistory.find({
      where: { user: { id: userId } },
      relations: ['user', 'donation'],
      order: { createdAt: 'DESC' },
    });

    return history;
  }
}
