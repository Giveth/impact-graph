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
  // https://arbiscan.io/tx/0xa72e9a2203920390b03e100fabae6600c0c2cc13b5074f5dfaf505f0668eb685
  {
    fromWalletAddress: '0xfe1552da65facaac5b50b73ceda4c993e16d4694',
    toWalletAddress: '0xb476ee7d610dae7b23b671ebc7bd6112e9772969',
    projectId: 2946,
    transactionId:
      '0xa72e9a2203920390b03e100fabae6600c0c2cc13b5074f5dfaf505f0668eb685',
    currency: 'USDC.e',
    tokenAddress: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    amount: 10,
    valueUsd: 10,
    transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    createdAt: millisecondTimestampToDate(1722411154000),
  },
  // ARB
  // https://arbiscan.io/tx/0x5bc98eef603fbe7b5409da4ee23035ea002efa0cd088583f51adf6cfd40d182c
  {
    fromWalletAddress: '0xd7a4467a26d26d00cb6044ce09ebd69edac0564c',
    toWalletAddress: '0x0914086551b4fcf7f344fc39dff9caa433620031',
    projectId: 3663,
    transactionId:
      '0x5bc98eef603fbe7b5409da4ee23035ea002efa0cd088583f51adf6cfd40d182c',
    currency: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    amount: 0.000035,
    valueUsd: 0.09,
    transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    createdAt: millisecondTimestampToDate(1722790601000),
  },
];

export class AddGivArbMissingDonations1723540109931
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
