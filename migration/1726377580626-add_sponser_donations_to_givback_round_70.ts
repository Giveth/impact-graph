import moment from 'moment';
import { MigrationInterface, QueryRunner } from 'typeorm';
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
import {
  refreshProjectActualMatchingView,
  refreshProjectEstimatedMatchingView,
} from '../src/services/projectViewsService';
import { Donation } from '../src/entities/donation';
import { NETWORK_IDS } from '../src/provider';

const millisecondTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

// https://github.com/Giveth/giveth-dapps-v2/issues/4595
const transactions: (Partial<Donation> & {
  donorName?: string;
  donorAddress?: string;
})[] = [
  // ARBITRUM
  // https://arbiscan.io/tx/0x600f1a9d23538e10e38e8c580248884b6e54ed72ae5225860cd528f10577cd8d
  {
    donorName: 'Jones DAO',
    donorAddress: '0xAa876583c941bEAF68bE800b14f8b35Cb9fA6694',
    fromWalletAddress: '0xAa876583c941bEAF68bE800b14f8b35Cb9fA6694',
    toWalletAddress: '0x6e8873085530406995170Da467010565968C7C62',
    projectId: 1443,
    transactionId:
      '0x600f1a9d23538e10e38e8c580248884b6e54ed72ae5225860cd528f10577cd8d',
    currency: 'USDT',
    tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    amount: 2_000,
    valueUsd: 2_000,
    transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    createdAt: millisecondTimestampToDate(1725354026000),
  },
];

export class AddSponserDonationsToGivbackRound701726377580626
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
        WHERE lower("walletAddress")=lower('${tx.donorAddress}')`)
      )[0];
      if (!user) {
        // eslint-disable-next-line no-console
        console.log('User is not in our DB, creating .... ');
        await queryRunner.query(`
                    INSERT INTO public.user ("walletAddress", role,"loginType", name) 
                    VALUES('${tx?.donorAddress?.toLowerCase()}', 'restricted','wallet', '${tx.donorName}');
                    `);
        user = (
          await queryRunner.query(`SELECT * FROM public.user
                        WHERE lower("walletAddress")=lower('${tx.donorAddress}')`)
        )[0];
      }

      // Set true for isTokenEligibleForGivback, isProjectVerified because Ashley mentioned we want to pay givback for them
      const createdAt = moment(tx.createdAt).format('YYYY-MM-DD HH:mm:ss');
      const project = (await findProjectById(
        tx.projectId as number,
      )) as Project;

      const { givbackFactor, projectRank, powerRound, bottomRankInRound } =
        await calculateGivbackFactor(tx.projectId as number);
      await queryRunner.query(`
            INSERT INTO donation ("toWalletAddress", "projectId", "fromWalletAddress", "userId", amount, currency, "transactionId", "transactionNetworkId", anonymous, "valueUsd", status,
             "segmentNotified", "isTokenEligibleForGivback", "isProjectVerified", "createdAt", "givbackFactor", "powerRound", "projectRank", "bottomRankInRound", "qfRoundId", "tokenAddress")
            VALUES ('${tx.toWalletAddress?.toLowerCase()}', ${tx.projectId}, '${tx.fromWalletAddress?.toLowerCase()}', ${user.id}, ${tx.amount}, '${tx.currency}', '${tx.transactionId?.toLowerCase()}', ${
              tx.transactionNetworkId
            }, false, ${tx.valueUsd}, 'verified',
              true, true, true, '${createdAt}', ${givbackFactor}, ${powerRound}, ${projectRank}, ${bottomRankInRound}, ${tx.qfRoundId || null}, '${
                tx.tokenAddress
              }')
            ON CONFLICT DO NOTHING;
        `);

      await updateUserTotalDonated(user.id);
      await updateUserTotalReceived(project.adminUser?.id);
      await updateProjectStatistics(tx.projectId as number);
    }

    await refreshProjectEstimatedMatchingView();
    await refreshProjectActualMatchingView();
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
