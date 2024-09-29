import {
  Arg,
  Field,
  Float,
  Int,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { getProjectUserRecordAmount } from '../repositories/projectUserRecordRepository';

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
}
