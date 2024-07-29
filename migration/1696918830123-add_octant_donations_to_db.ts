import { MigrationInterface, QueryRunner } from 'typeorm';
import moment from 'moment';
import config from '../src/config.js';
import { AppDataSource } from '../src/orm.js';
import { findProjectById } from '../src/repositories/projectRepository.js';
import { Project } from '../src/entities/project.js';
import { calculateGivbackFactor } from '../src/services/givbackService.js';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../src/services/userService.js';
import { Donation } from '../src/entities/donation.js';
import { NETWORK_IDS } from '../src/provider.js';
import { updateProjectStatistics } from '../src/services/projectService.js';

const octantDonationTxHash =
  '0xe70a8ee39511d3c186ea53c4bdd9fcd34f658d68ca7e1bbbc2b231630ac7fa3b';
const octantFromAddress = '0x4f80ce44afab1e5e940574f135802e12ad2a5ef0';
const octantDonationTxTimeStamp = new Date(1690826831000);

const transactions: Partial<Donation>[] = [
  // Use below query to find project by walletAddress
  /**
     SELECT *
     FROM "project"
     WHERE "id" IN (
     SELECT "projectId"
     FROM "project_address"
     WHERE lower("address") = lower('0xb423a138fd171c28d90a5883a01ec92ff3d63609')
     );
     */

  // Griff: For Octant we are saying $125,453.3 to the matching pool
  // and $53,765.70 to Giveth: Community of Makers ... But both of these donations were done in 1 transaction:
  // https://etherscan.io/tx/0xe70a8ee39511d3c186ea53c4bdd9fcd34f658d68ca7e1bbbc2b231630ac7fa3b
  {
    fromWalletAddress: octantFromAddress,
    toWalletAddress: '0x4d9339dd97db55e3b9bcbe65de39ff9c04d1c2cd',
    // https://giveth.io/project/the-giveth-community-of-makers
    projectId: 1,
    transactionId: octantDonationTxHash,
    currency: 'ETH',
    amount: 28.967,
    valueUsd: 53_765.7,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: octantDonationTxTimeStamp,
  },
  {
    fromWalletAddress: octantFromAddress,
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId: octantDonationTxHash,
    currency: 'ETH',
    amount: 67.59,
    valueUsd: 125_453.3,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: octantDonationTxTimeStamp,
  },

  // https://etherscan.io/tx/0x30954cb441cb7b2184e6cd1afc6acbd1318f86a68b669f6bfb2786dd459e2d6c
  {
    fromWalletAddress: '0x3808429e985f0b06878c74089831865e5d82a584',
    toWalletAddress:
      '0x30954cb441cb7b2184e6cd1afc6acbd1318f86a68b669f6bfb2786dd459e2d6c',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x30954cb441cb7b2184e6cd1afc6acbd1318f86a68b669f6bfb2786dd459e2d6c',
    currency: 'ETH',
    isProjectVerified: true,
    isTokenEligibleForGivback: true,
    amount: 5,
    valueUsd: 9_458.4,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1697618053000),
  },
];

export class addOctantDonationsToDb1696918830123 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;

    if (environment !== 'production') {
      // eslint-disable-next-line no-console
      console.log('We want to create these donations in production DB');
      return;
    }

    await AppDataSource.initialize();
    for (const tx of transactions) {
      const user = (
        await queryRunner.query(`SELECT * FROM public.user
        WHERE "walletAddress"='${tx.fromWalletAddress}'`)
      )[0];
      // Set true for isTokenEligibleForGivback, isProjectVerified because Ashley mentioned we want to pay givback for them
      const createdAt = moment(tx.createdAt).format('YYYY-MM-DD HH:mm:ss');
      const project = (await findProjectById(
        tx.projectId as number,
      )) as Project;
      const { givbackFactor, projectRank, powerRound, bottomRankInRound } =
        await calculateGivbackFactor(tx.projectId as number);
      await queryRunner.query(`
           INSERT INTO donation ("toWalletAddress", "projectId", "fromWalletAddress", "userId", amount, currency, "transactionId", "transactionNetworkId", anonymous, "valueUsd", status,
            "segmentNotified", "isTokenEligibleForGivback", "isProjectVerified", "createdAt", "givbackFactor", "powerRound", "projectRank", "bottomRankInRound")
           VALUES ('${tx.toWalletAddress}', ${tx.projectId}, '${tx.fromWalletAddress}', ${user.id}, ${tx.amount}, '${tx.currency}', '${tx.transactionId}', ${tx.transactionNetworkId}, false, ${tx.valueUsd}, 'verified', 
             true, true, true, '${createdAt}', ${givbackFactor}, ${powerRound}, ${projectRank}, ${bottomRankInRound});
                `);
      await updateUserTotalDonated(user.id);
      await updateUserTotalReceived(project.adminUser?.id);
      await updateProjectStatistics(tx.projectId as number);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                 DELETE FROM donation
                 WHERE "transactionId"='${octantDonationTxHash}' OR "transactionId"='0x30954cb441cb7b2184e6cd1afc6acbd1318f86a68b669f6bfb2786dd459e2d6c'
                `);
  }
}
