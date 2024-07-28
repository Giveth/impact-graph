import moment from 'moment';
import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../src/config.js';
import { Donation } from '../src/entities/donation.js';
import { NETWORK_IDS } from '../src/provider.js';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../src/services/userService.js';
import { findProjectById } from '../src/repositories/projectRepository.js';
import { Project } from '../src/entities/project.js';
import { calculateGivbackFactor } from '../src/services/givbackService.js';
import { AppDataSource } from '../src/orm.js';
import { updateProjectStatistics } from '../src/services/projectService.js';

const fromWalletAddress = '0x6bed0ce7be8dc307b69cfdc100f87db51bc3823a';
const txHash =
  '0x639f0170a9d56a3ea007be67afac8d5afa945421c517dca4c6d54e7941a2e827';
const txTimeStamp = new Date(1684435355000);
const transactions: Partial<Donation>[] = [
  // This is 16 donations on mainnet: https://etherscan.io/tx/0x639f0170a9d56a3ea007be67afac8d5afa945421c517dca4c6d54e7941a2e827

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

  {
    fromWalletAddress,
    toWalletAddress: '0xb423a138fd171c28d90a5883a01ec92ff3d63609',
    // https://giveth.io/project/emprende-dao
    projectId: 2097,
    transactionId: txHash,
    currency: 'PAN',
    amount: 140_577.98,
    valueUsd: 2_687.89,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x5a9ce898f0b03c5a3cd2d0c727efdd0555c86f81',
    // https://giveth.io/project/Shenanigan-0
    projectId: 1471,
    transactionId: txHash,
    currency: 'PAN',
    amount: 40_885.77,
    valueUsd: 781.75,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x1b8c7f06f537711a7caf6770051a43b4f3e69a7e',
    // https://giveth.io/project/1hive-gardens-0
    projectId: 1439,
    transactionId: txHash,
    currency: 'PAN',
    amount: 25_923.28,
    valueUsd: 495.66,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x7587cfbd20e5a970209526b4d1f69dbaae8bed37',
    // https://giveth.io/project/follow-the-black-hare
    projectId: 2119,
    transactionId: txHash,
    currency: 'PAN',
    amount: 16_980.23,
    valueUsd: 324.67,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xa64f2228ccec96076c82abb903021c33859082f8',
    // https://giveth.io/project/lunco-robotics-engineering
    projectId: 1951,
    transactionId: txHash,
    currency: 'PAN',
    amount: 6_917.87,
    valueUsd: 132.27,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x2bf034eccebc8cd60dab9c249b6c2996dcb7d8ec',
    // https://giveth.io/project/moloch-cloudship-0
    projectId: 308,
    transactionId: txHash,
    currency: 'PAN',
    amount: 6_603,
    valueUsd: 126.25,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x95729bb493a6a9ae2763815afc9ae950e94d63e7',
    // https://giveth.io/project/africa-hyper-volunteers-centre
    projectId: 2003,
    transactionId: txHash,
    currency: 'PAN',
    amount: 5_659.71,
    valueUsd: 108.22,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x3455fbb4d34c6b47999b66c83aa7bd8fddade638',
    // https://giveth.io/project/metagame-0
    projectId: 1642,
    transactionId: txHash,
    currency: 'PAN',
    amount: 4_716.43,
    valueUsd: 90.18,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xdc2a4bf46ef158f86274c02bd7f027f31da9ebc1',
    // https://giveth.io/project/akiyadao
    projectId: 2111,
    transactionId: txHash,
    currency: 'PAN',
    amount: 3_773.14,
    valueUsd: 72.14,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x21e0ca21f517a26db49ec8fcf05fceabbabe98fa',
    // https://giveth.io/project/free-the-food-0
    projectId: 34,
    transactionId: txHash,
    currency: 'PAN',
    amount: 3_773.14,
    valueUsd: 72.14,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x48b8cb893429d97f3fecbfe6301bda1c6936d8d9',
    // https://giveth.io/project/NFTP-Rainbow-Rolls-0
    projectId: 325,
    transactionId: txHash,
    currency: 'PAN',
    amount: 3_773.14,
    valueUsd: 72.14,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xbcedb3e27f2650f4698e1cc6a02bbd2cef123b4b',
    // https://giveth.io/project/giveth-names
    projectId: 2226,
    transactionId: txHash,
    currency: 'PAN',
    amount: 3_144.29,
    valueUsd: 60.12,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xdf00c5b8cd54affebc66bc6944313a3df2d0209f',
    // https://giveth.io/project/cambiatus
    projectId: 2198,
    transactionId: txHash,
    currency: 'PAN',
    amount: 1_886.57,
    valueUsd: 36.07,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xf4efd5b9db84e92bb28dd7459ff99d8b7489aaa3',
    // https://giveth.io/project/art-and-culture-center
    projectId: 2213,
    transactionId: txHash,
    currency: 'PAN',
    amount: 628.86,
    valueUsd: 12.02,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xfc9ca0a1382ee8c4c64e8675bea991840119f93c',
    // https://giveth.io/project/empowerment-incubator
    projectId: 1868,
    transactionId: txHash,
    currency: 'PAN',
    amount: 628.86,
    valueUsd: 12.02,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xf257120b101032f4523afafde9c010fc9e51dc74',
    // https://giveth.io/project/the-village-project
    projectId: 51,
    transactionId: txHash,
    currency: 'PAN',
    amount: 628.86,
    valueUsd: 12.02,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: txTimeStamp,
  },
];

export class addSomeMainnetDonations1684654545845
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;

    if (environment !== 'production') {
      // eslint-disable-next-line no-console
      console.log('We want to create these donations in production DB');
      return;
    }
    const user = (
      await queryRunner.query(`SELECT * FROM public.user
        WHERE "walletAddress"='${fromWalletAddress}'`)
    )[0];
    await AppDataSource.initialize();
    for (const tx of transactions) {
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
                 WHERE "transactionId"='${txHash}'
                `);
  }
}
