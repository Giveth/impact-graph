import { Ctx, Field, Float, ObjectType, Query, Resolver } from 'type-graphql';
import { User } from '../entities/user';
import { Donation } from '../entities/donation';
import { QaccPointsHistory } from '../entities/qaccPointsHistory';
import { ApolloContext } from '../types/ApolloContext';
import { findUserById } from '../repositories/userRepository';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';

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
  async getQaccPointsHistory(@Ctx() ctx: ApolloContext) {
    const userId = ctx?.req?.user?.userId;
    const qaccUser = await findUserById(userId);
    if (!qaccUser) {
      throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
    }

    const history = await QaccPointsHistory.find({
      where: { user: { id: userId } },
      relations: ['user', 'donation'],
      order: { createdAt: 'DESC' },
    });

    return history;
  }
}
