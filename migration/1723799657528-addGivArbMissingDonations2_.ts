import moment from 'moment';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { Donation } from '../src/entities/donation';
import { NETWORK_IDS } from '../src/provider';
import config from '../src/config';
import { AppDataSource } from '../src/orm';
import { findProjectById } from '../src/repositories/projectRepository';
import { Project } from '../src/entities/project';
import { calculateGivbackFactor } from '../src/services/givbackService';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../src/services/userService';
import { updateProjectStatistics } from '../src/services/projectService';
import { Token } from '../src/entities/token';

const millisecondTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

const transactions: Partial<Donation>[] = [
  // ARB
  // https://basescan.org/tx/0xa9ae482398755efa440602e64852546d92c8b9e947ccc74e52f818db8028bf86
  {
    fromWalletAddress: '0xa91041ab86dff360503f4c9084585a0d00324e4a',
    toWalletAddress: '0x6ebb512f0c282a3617b337db9ea294b016714609',
    projectId: 3637,
    transactionId:
      '0xa9ae482398755efa440602e64852546d92c8b9e947ccc74e52f818db8028bf86',
    currency: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    amount: 0.000578,
    valueUsd: 1.57,
    transactionNetworkId: NETWORK_IDS.BASE_MAINNET,
    createdAt: millisecondTimestampToDate(1723446379000),
    qfRoundId: 11,
  },
  // ARB
  // https://basescan.org/tx/0x936a6baddab28d7f1f5331a146039a5408fe95c6d9924b45f0dc823f301c7315
  {
    fromWalletAddress: '0xa91041ab86dff360503f4c9084585a0d00324e4a',
    toWalletAddress: '0xa80edec55635eba7251f5d84b3935ceb56b31b89',
    projectId: 2915,
    transactionId:
      '0x936a6baddab28d7f1f5331a146039a5408fe95c6d9924b45f0dc823f301c7315',
    currency: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    amount: 0.000578,
    valueUsd: 1.57,
    transactionNetworkId: NETWORK_IDS.BASE_MAINNET,
    createdAt: millisecondTimestampToDate(1723445819000),
    qfRoundId: 11,
  },
];

export class AddGivArbMissingDonations2_1723799657528
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;

    if (environment !== 'production') {
      // eslint-disable-next-line no-console
      console.log('We just want to create these donations in production DB');
      return;
    }

    await AppDataSource.initialize();
    for (const tx of transactions) {
      let user = (
        await queryRunner.query(`SELECT * FROM public.user
        WHERE lower("walletAddress")=lower('${tx.fromWalletAddress}')`)
      )[0];
      if (!user) {
        // eslint-disable-next-line no-console
        console.log('User is not in our DB, creating .... ');
        await queryRunner.query(`
                    INSERT INTO public.user ("walletAddress", role,"loginType", name) 
                    VALUES('${tx?.fromWalletAddress?.toLowerCase()}', 'restricted','wallet', NULL);
                    `);
        user = (
          await queryRunner.query(`SELECT * FROM public.user
                        WHERE lower("walletAddress")=lower('${tx.fromWalletAddress}')`)
        )[0];
      }

      // Set true for isTokenEligibleForGivback, isProjectVerified because Ashley mentioned we want to pay givback for them
      const createdAt = moment(tx.createdAt).format('YYYY-MM-DD HH:mm:ss');
      const project = (await findProjectById(
        tx.projectId as number,
      )) as Project;
      const token = await Token.findOneBy({
        networkId: tx.transactionNetworkId,
        symbol: tx.currency,
      });
      const isTokenEligibleForGivback = !!token?.isGivbackEligible;

      const { givbackFactor, projectRank, powerRound, bottomRankInRound } =
        await calculateGivbackFactor(tx.projectId as number);
      await queryRunner.query(`
            INSERT INTO donation ("toWalletAddress", "projectId", "fromWalletAddress", "userId", amount, currency, "transactionId", "transactionNetworkId", anonymous, "valueUsd", status,
             "segmentNotified", "isTokenEligibleForGivback", "isProjectVerified", "createdAt", "givbackFactor", "powerRound", "projectRank", "bottomRankInRound", "qfRoundId", "tokenAddress")
            VALUES ('${tx.toWalletAddress?.toLowerCase()}', ${tx.projectId}, '${tx.fromWalletAddress?.toLowerCase()}', ${user.id}, ${tx.amount}, '${tx.currency}', '${tx.transactionId?.toLowerCase()}', ${
              tx.transactionNetworkId
            }, false, ${tx.valueUsd}, 'verified',
              true, ${isTokenEligibleForGivback}, ${project.verified}, '${createdAt}', ${givbackFactor}, ${powerRound}, ${projectRank}, ${bottomRankInRound}, ${tx.qfRoundId || null}, '${
                tx.tokenAddress
              }')
            ON CONFLICT DO NOTHING;
        `);

      await updateUserTotalDonated(user.id);
      await updateUserTotalReceived(project.adminUserId);
      await updateProjectStatistics(tx.projectId as number);
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
