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
import { findUserById } from '../repositories/userRepository';

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
class QaccStat {
  @Field(_type => Float)
  totalCollected: number;

  @Field(_type => Float)
  qfTotalCollected: number;

  @Field(_type => Int)
  contributorsCount: number;
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
    @Arg('seasonNumber', _type => Int, { nullable: true })
    seasonNumber?: number,
  ) {
    const record = await getProjectUserRecordAmount({
      projectId,
      userId,
      seasonNumber,
    });
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

    const dbUser = await findUserById(user.userId);
    if (!dbUser) {
      throw new Error(`user not found with id ${user.userId}`);
    }

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
    } else if (
      dbUser.hasEnoughGitcoinAnalysisScore ||
      dbUser.hasEnoughGitcoinPassportScore ||
      dbUser.skipVerification
    ) {
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

  @Query(_returns => QaccStat)
  async qAccStat() {
    const state = await qAccService.getQAccStat();
    return {
      totalCollected: state.totalCollected,
      qfTotalCollected: state.qfTotalCollected,
      contributorsCount: state.totalContributors,
    };
  }
}
