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
import { refreshProjectEstimatedMatchingView } from '../src/services/projectViewsService.js';
import { updateProjectStatistics } from '../src/services/projectService.js';

const QF_ROUND_ID = 5;
const millisecondTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

// Use below query to find project by toWalletAddress
/**
 SELECT *
 FROM "project"
 WHERE "id" IN (
 SELECT "projectId"
 FROM "project_address"
 WHERE lower("address") = lower('0xb423a138fd171c28d90a5883a01ec92ff3d63609')
 );
 */

const transactions: Partial<Donation>[] = [
  // https://github.com/Giveth/giveth-dapps-v2/issues/3520#issuecomment-1866554847

  // https://optimistic.etherscan.io/tx/0x0cbc732797ab1f9caeb14b113a2962fc2c4d569ee41a4300029be0260d31b614
  {
    fromWalletAddress: '0xed8db37778804a913670d9367aaf4f043aad938b',
    toWalletAddress: '0x1de498918d04B8Bf162210103CDd547f73387B2E',
    // https://giveth.io/project/creating-the-perfect-villages-in-burundi
    projectId: 136,
    transactionId:
      '0x0cbc732797ab1f9caeb14b113a2962fc2c4d569ee41a4300029be0260d31b614',
    currency: 'GIV',
    tokenAddress: '0x528CDc92eAB044E1E39FE43B9514bfdAB4412B98',
    amount: 1500,
    valueUsd: 14.46,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703079771000),
  },

  // https://optimistic.etherscan.io/tx/0xec8349aef06c97bf1e26fe97de2d05c33243bcc8d78703f37ee2fbb5a85ce6ec
  {
    fromWalletAddress: '0xed8db37778804a913670d9367aaf4f043aad938b',
    toWalletAddress: '0x4E8356170111dEb9408f8bc98C9a395c0bF330Fb',
    // https://giveth.io/project/pcrf-palestine-childrens-relief-fund
    projectId: 2880,
    transactionId:
      '0xec8349aef06c97bf1e26fe97de2d05c33243bcc8d78703f37ee2fbb5a85ce6ec',
    currency: 'USDC',
    tokenAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    amount: 150,
    valueUsd: 150,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703078701000),
  },

  // https://optimistic.etherscan.io/tx/0xc34714b9fc44e5a1afcd611b168c65b980d6ed14b5b4381401c250acf09fa589
  {
    fromWalletAddress: '0xed8db37778804a913670d9367aaf4f043aad938b',
    toWalletAddress: '0x319F7929D5533947796bd02CFbAb282d7Bb4cf83',
    // https://giveth.io/project/end-homelessness-thanks-to-web3-community
    projectId: 2636,
    transactionId:
      '0xc34714b9fc44e5a1afcd611b168c65b980d6ed14b5b4381401c250acf09fa589',
    currency: 'GIV',
    tokenAddress: '0x528CDc92eAB044E1E39FE43B9514bfdAB4412B98',
    amount: 500,
    valueUsd: 4.81,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703080357000),
  },

  // https://optimistic.etherscan.io/tx/0x3367ba1fa95a672030a6b70ba1649551f7ae38271834066d6bcd9a120567c393
  {
    fromWalletAddress: '0x41cb654d1f47913acab158a8199191d160dabe4a',
    toWalletAddress: '0xe126b3E5d052f1F575828f61fEBA4f4f2603652a',
    // https://giveth.io/project/revokecash
    projectId: 2955,
    transactionId:
      '0x3367ba1fa95a672030a6b70ba1649551f7ae38271834066d6bcd9a120567c393',
    currency: 'USDC',
    tokenAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    amount: 3,
    valueUsd: 3,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703166533000),
  },

  // https://optimistic.etherscan.io/tx/0x8838d5be728ac29110340aacd883e9ede19048146e1c28842e4f4e28e4ba4761
  {
    fromWalletAddress: '0x48c29821235ffc527d1a265eaf2dde0b4a1a0f07',
    toWalletAddress: '0x42eA99EE6FfF2Dc8d4c3F95eCcD17C5055905139',
    // https://giveth.io/project/dream-dao
    projectId: 2778,
    transactionId:
      '0x8838d5be728ac29110340aacd883e9ede19048146e1c28842e4f4e28e4ba4761',
    currency: 'DAI',
    tokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    amount: 1,
    valueUsd: 1,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703083505000),
  },

  // https://optimistic.etherscan.io/tx/0x519eba6cb2cd23629a190dec600faa025f485dac8e6b331d299e87cea837d18a
  {
    fromWalletAddress: '0x1900c042ce71f8384e19b207b6cd155dd069e3ec',
    toWalletAddress: '0xB352bB4E2A4f27683435f153A259f1B207218b1b',
    // https://giveth.io/project/ethlimo
    projectId: 2795,
    transactionId:
      '0x519eba6cb2cd23629a190dec600faa025f485dac8e6b331d299e87cea837d18a',
    currency: 'USDC',
    tokenAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    amount: 2,
    valueUsd: 2,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703012697000),
  },

  // https://optimistic.etherscan.io/tx/0xc047f19d1b5f868fbc8e9db0c226a006e62fd59975375118b54718b0ea27bba0
  {
    fromWalletAddress: '0x1900c042ce71f8384e19b207b6cd155dd069e3ec',
    toWalletAddress: '0xB352bB4E2A4f27683435f153A259f1B207218b1b',
    // https://giveth.io/project/ethlimo
    projectId: 2795,
    transactionId:
      '0xc047f19d1b5f868fbc8e9db0c226a006e62fd59975375118b54718b0ea27bba0',
    currency: 'USDC',
    tokenAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    amount: 2,
    valueUsd: 2,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703012601000),
  },

  // https://optimistic.etherscan.io/tx/0x4c68af6ee296fe43ba205816e05e34ac6d84190d8ca793fa217f416cf8835429
  {
    fromWalletAddress: '0x01d2fbf014fd3d8bdc9639de215de65e75abd856',
    toWalletAddress: '0x3b6a2bb616C2ea5021816BF1be5F9e8D8810F362',
    // https://giveth.io/project/soildao-steward-platform
    projectId: 2783,
    transactionId:
      '0x4c68af6ee296fe43ba205816e05e34ac6d84190d8ca793fa217f416cf8835429',
    currency: 'USDC',
    tokenAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    amount: 1,
    valueUsd: 1,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703006929000),
  },

  // https://optimistic.etherscan.io/tx/0xcfc02cf1d3f2249d6551ffca8f2b9cba75b40d3841efd3f031164327a10c2e5b
  {
    fromWalletAddress: '0xed8db37778804a913670d9367aaf4f043aad938b',
    toWalletAddress: '0xB4964e1ecA55Db36a94e8aeFfBFBAb48529a2f6c',
    // https://giveth.io/project/skatehive-skateboarding-community
    projectId: 1919,
    transactionId:
      '0xcfc02cf1d3f2249d6551ffca8f2b9cba75b40d3841efd3f031164327a10c2e5b',
    currency: 'GIV',
    tokenAddress: '0x528CDc92eAB044E1E39FE43B9514bfdAB4412B98',
    amount: 1500,
    valueUsd: 14.44,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703080065000),
  },

  // https://optimistic.etherscan.io/tx/0x9ad5a37b1c71a940862f152e9d0d557755f4f7ddb5cc1327174a1ede90bceb64
  {
    fromWalletAddress: '0xb3541aa3247304dcce993b9b8bd1ee3c7dc49367',
    toWalletAddress: '0x1598394c7f5Ec6008bB3dF73e4998b92bdEFa4D9',
    // https://giveth.io/project/dappnode
    projectId: 2242,
    transactionId:
      '0x9ad5a37b1c71a940862f152e9d0d557755f4f7ddb5cc1327174a1ede90bceb64',
    currency: 'USDC',
    tokenAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    amount: 500,
    valueUsd: 500,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703348735000),
  },

  // https://optimistic.etherscan.io/tx/0x2e410bf8b53bbefe6025a6409fc9cee4f29e79b7f3025f260d85fd7555496e46
  {
    fromWalletAddress: '0x41cb654d1f47913acab158a8199191d160dabe4a',
    toWalletAddress: '0x29185eB8cfD22Aa719529217bFbadE61677e0Ad2',
    // https://giveth.io/project/digital-street-musician-doing-free-live-concerts
    projectId: 2961,
    transactionId:
      '0x2e410bf8b53bbefe6025a6409fc9cee4f29e79b7f3025f260d85fd7555496e46',
    currency: 'USDC',
    tokenAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    amount: 4,
    valueUsd: 4,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703349653000),
  },

  // https://optimistic.etherscan.io/tx/0xead36175c01203d5ed31a056f69d5a10e97084267bab746c1f71e09b6921eeda
  {
    fromWalletAddress: '0x77c3db040f79ae46a91529a667c03ab484b37116',
    toWalletAddress: '0xbec643bd5b7f5e9190617ca4187ef0455950c51c',
    transactionId:
      '0xead36175c01203d5ed31a056f69d5a10e97084267bab746c1f71e09b6921eeda',
    // https://giveth.io/project/itu-blockchain
    projectId: 2067,
    currency: 'USDC',
    tokenAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    amount: 67,
    valueUsd: 67,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1703432955000),
  },
];

export class addMissedOpDonationsToDb1703398409668
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
      const user = (
        await queryRunner.query(`SELECT * FROM public.user
        WHERE lower("walletAddress")=lower('${tx.fromWalletAddress}')`)
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
            "segmentNotified", "isTokenEligibleForGivback", "isProjectVerified", "createdAt", "givbackFactor", "powerRound", "projectRank", "bottomRankInRound", "qfRoundId", "tokenAddress")
           VALUES ('${tx.toWalletAddress?.toLowerCase()}', ${
             tx.projectId
           }, '${tx.fromWalletAddress?.toLocaleLowerCase()}', ${user.id}, ${
             tx.amount
           }, '${tx.currency}', '${tx.transactionId?.toLocaleLowerCase()}', ${
             tx.transactionNetworkId
           }, false, ${tx.valueUsd}, 'verified',
             true, true, true, '${createdAt}', ${givbackFactor}, ${powerRound}, ${projectRank}, ${bottomRankInRound}, ${QF_ROUND_ID}, '${
               tx.tokenAddress
             }');
                `);

      await updateUserTotalDonated(user.id);
      await updateUserTotalReceived(project.adminUser?.id);
      await updateProjectStatistics(tx.projectId as number);
    }

    await refreshProjectEstimatedMatchingView();
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
