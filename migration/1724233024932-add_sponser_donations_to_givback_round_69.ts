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
import {
  refreshProjectActualMatchingView,
  refreshProjectEstimatedMatchingView,
} from '../src/services/projectViewsService';

const millisecondTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

// https://github.com/Giveth/giveth-dapps-v2/issues/4595
const transactions: (Partial<Donation> & {
  donorName?: string;
  donorAddress?: string;
})[] = [
  // ARBITRUM
  // https://arbiscan.io/tx/0xf08ac85b9f8adbdc1ec327ef7f801f9953f5eb4bef9113ceb6665273e5b4c7bf
  {
    donorName: 'MUX',
    donorAddress: '0x7C8126ef43c09C22bf0CcdF7426180e6c48068A5',
    fromWalletAddress: '0x7C8126ef43c09C22bf0CcdF7426180e6c48068A5',
    toWalletAddress: '0x6e8873085530406995170Da467010565968C7C62',
    projectId: 1443,
    transactionId:
      '0xf08ac85b9f8adbdc1ec327ef7f801f9953f5eb4bef9113ceb6665273e5b4c7bf',
    currency: 'USDC',
    tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    qfRoundId: 11,
    amount: 1_999,
    valueUsd: 1_999,
    transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    createdAt: millisecondTimestampToDate(1724033115000),
  },
];

export class AddSponserDonationsToGivbackRound691724233024932
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

  async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
