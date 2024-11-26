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
import { getUserById } from '../services/userService';

@ObjectType()
class ProjectUserRecordAmounts {
  @Field(_type => Float)
  totalDonationAmount: number;

  @Field(_type => Float)
  eaTotalDonationAmount: number;

  @Field(_type => Float)
  qfTotalDonationAmount: number;
}

@ObjectType()
class UnusedCapResponse {
  @Field(_type => Float)
  unusedCap: number;
}

@ObjectType()
class QAccResponse {
  @Field(_type => Float)
  qAccCap: number;

  @Field(_type => UnusedCapResponse, { nullable: true })
  gitcoinPassport?: UnusedCapResponse;

  @Field(_type => UnusedCapResponse, { nullable: true })
  zkId?: UnusedCapResponse;
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

  @Query(_returns => QAccResponse)
  async userCaps(
    @Arg('projectId', _type => Int, { nullable: false }) projectId: number,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<QAccResponse> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const dbUser = await getUserById(user.userId);

    const qAccCap = await qAccService.getQAccDonationCap({
      projectId,
      userId: user.userId,
    });

    const response: QAccResponse = {
      qAccCap,
    };

    if (dbUser.privadoVerified) {
      response.zkId = {
        unusedCap: qAccCap,
      };
    } else if (dbUser.hasEnoughGitcoinAnalysisScore) {
      const cap = await qAccService.getUserRemainedCapBasedOnGitcoinScore({
        projectId,
        user: dbUser,
      });
      response.gitcoinPassport = {
        unusedCap: cap,
      };
    }

    return response;
  }
}
