import {
  Arg,
  Ctx,
  Field,
  Float,
  Int,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { getProjectUserRecordAmount } from '../repositories/projectUserRecordRepository';
import qAccService from '../services/qAccService';
import { ApolloContext } from '../types/ApolloContext';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';

@ObjectType()
class ProjectUserRecordAmounts {
  @Field(_type => Float)
  totalDonationAmount: number;

  @Field(_type => Float)
  eaTotalDonationAmount: number;

  @Field(_type => Float)
  qfTotalDonationAmount: number;
}
@Resolver()
export class QAccResolver {
  @Query(_returns => ProjectUserRecordAmounts)
  async projectUserTotalDonationAmounts(
    @Arg('projectId', _type => Int, { nullable: false }) projectId: number,
    @Arg('userId', _type => Int, { nullable: false }) userId: number,
  ) {
    const record = await getProjectUserRecordAmount({ projectId, userId });
    return {
      totalDonationAmount: record.totalDonationAmount,
      eaTotalDonationAmount: record.eaTotalDonationAmount,
      qfTotalDonationAmount: record.qfTotalDonationAmount,
    };
  }

  @Query(_returns => Float)
  async projectUserDonationCap(
    @Arg('projectId', _type => Int, { nullable: false }) projectId: number,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    return await qAccService.getQAccDonationCap({
      projectId,
      userId: user.userId,
    });
  }
}
