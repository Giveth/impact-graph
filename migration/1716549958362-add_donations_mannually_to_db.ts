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
import { refreshProjectEstimatedMatchingView } from '../src/services/projectViewsService';
import { updateProjectStatistics } from '../src/services/projectService';

const millisecondTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

// Use below query to find project by toWalletAddress
/**
 SELECT p.*, p.slug
 FROM "project" p
 WHERE p."id" IN (
 SELECT pa."projectId"
 FROM "project_address" pa
 WHERE lower(pa."address") = lower('0x6e8873085530406995170da467010565968c7c62')
 );

 */

const transactions: (Partial<Donation> & {
  donorName?: string;
  donorAddress?: string;
})[] = [
  // https://github.com/Giveth/giveth-dapps-v2/issues/4201

  // https://optimistic.etherscan.io/tx/0xd5b98a3a6a928c944514c4bb7550c7a2c49b4592af7d4e0e06ea66f530fd8211
  {
    // LottoPGF
    donorName: 'LottoPGF',
    donorAddress: '0x77fb4fa1ABA92576942aD34BC47834059b84e693',
    fromWalletAddress: '0x437A4909293e704bB090357d714b585bF5658C4e',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0xd5b98a3a6a928c944514c4bb7550c7a2c49b4592af7d4e0e06ea66f530fd8211',
    currency: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    amount: 0.49,
    valueUsd: 1462.7,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1713354817000),
  },

  // https://arbiscan.io/tx/0x22e9a6665bdd3b4d0bca76f2fc4db587d27e646a8933cfa4d0aca8b08715c3d3
  {
    // GMX
    donorName: 'GMX',
    fromWalletAddress: '0xb1F3D086b7c5114F429dc48530C7A0a20a8B65CE',
    donorAddress: '0x6da54f64d189a3cd68d1b7ab016ddabd112ad01f',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x22e9a6665bdd3b4d0bca76f2fc4db587d27e646a8933cfa4d0aca8b08715c3d3',
    currency: 'USDC',
    tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    amount: 7500,
    valueUsd: 7500,
    // transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    createdAt: millisecondTimestampToDate(1714247188000),
  },

  // https://arbiscan.io/tx/0x38e060142c75fa4f3d2eefd27556ef899b3a6faa61bbd842ac7b06cfdd5fad2f
  //TODO I set the network for all these donations to OP to make sure givbacks will distribute on OP
  // but later we shuuld change it back to the right network
  {
    // Premia
    donorName: 'Premia',
    fromWalletAddress: '0xfc5538E1E9814eD6487b407FaD7b5710739A1cC2',
    donorAddress: '0x5ca1ea5549e4e7cb64ae35225e11865d2572b3f9',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x38e060142c75fa4f3d2eefd27556ef899b3a6faa61bbd842ac7b06cfdd5fad2f',
    currency: 'USDC.e',
    tokenAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    amount: 1500,
    valueUsd: 1500,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    // transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    createdAt: millisecondTimestampToDate(1713595569000),
  },

  // https://arbiscan.io/tx/0x5624a9d6b1894c6275827864b34396a89f65dd07fa0ba2d9b48e170a5bbe14c3
  {
    // MUX
    donorName: 'MUX',
    fromWalletAddress: '0x7C8126ef43c09C22bf0CcdF7426180e6c48068A5',
    donorAddress: '0xf2a26c73f52c903d21ad85626b344d48e7af72ee',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x5624a9d6b1894c6275827864b34396a89f65dd07fa0ba2d9b48e170a5bbe14c3',
    currency: 'USDC',
    tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    amount: 1500,
    valueUsd: 1500,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    // transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    createdAt: millisecondTimestampToDate(1713844247000),
  },

  // https://arbiscan.io/tx/0x3bc748bc39ae433a083a54b073461d263919bdcf52746197d335586c86ab2d46
  {
    // Rage Trade
    donorName: 'Rage Trade',
    fromWalletAddress: '0x507c7777837B85EDe1e67f5A4554dDD7e58b1F87',
    donorAddress: '0x507c7777837b85ede1e67f5a4554ddd7e58b1f87',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x3bc748bc39ae433a083a54b073461d263919bdcf52746197d335586c86ab2d46',
    currency: 'USDC.e',
    tokenAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    amount: 1500,
    valueUsd: 1500,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    // transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    createdAt: millisecondTimestampToDate(1714074373000),
  },

  // https://arbiscan.io/tx/0x83963132bee77a7a06ed8ebe1fc2557fea9971f1fb5482d62e145b3d1f0bec73
  {
    // Dodo
    donorName: 'Dodo',
    fromWalletAddress: '0x01b6c66dee0476B70938Cf87Fe372848C58b6a13',
    donorAddress: '0x28C6c06298d514Db089934071355E5743bf21d60',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x83963132bee77a7a06ed8ebe1fc2557fea9971f1fb5482d62e145b3d1f0bec73',
    currency: 'USDT',
    tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    amount: 1500,
    valueUsd: 1500,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    // transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1714044191000),
  },

  // https://arbiscan.io/tx/0xe3bc8e163001ec898a0c27be4fd1802b747b1d2b1c79e2ff404ac91d6f9d239a
  {
    // Gitcoin (Kyle)
    donorName: 'Kyle',
    fromWalletAddress: '0x202d0b551f0e137Efb419e70e1776B6d578bdbF3',
    donorAddress: '0x563537412ad5d49faa7fa442b9193b8238d98c3c',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0xe3bc8e163001ec898a0c27be4fd1802b747b1d2b1c79e2ff404ac91d6f9d239a',
    currency: 'USDT',
    tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    amount: 7500,
    valueUsd: 7500,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    // transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1714052806000),
  },

  // https://arbiscan.io/tx/0xa8962021b121f4f2b6bd8572ec450d0d81862c5284b5ddc8c851d0ecb3afb499
  {
    // WOOFi
    donorName: 'WOOFi',
    fromWalletAddress: '0x7C8126ef43c09C22bf0CcdF7426180e6c48068A5',
    donorAddress: '0x63dfe4e34a3bfc00eb0220786238a7c6cef8ffc4',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0xa8962021b121f4f2b6bd8572ec450d0d81862c5284b5ddc8c851d0ecb3afb499',
    currency: 'USDC',
    tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    amount: 1500,
    valueUsd: 1500,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    // transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    createdAt: millisecondTimestampToDate(1714033588000),
  },

  // https://github.com/Giveth/impact-graph/issues/1580
  // https://etherscan.io/tx/0x12d699a9c3eb3605aebbeeea9453286a16d2772738a837efe36cd4a891f75893
  {
    // Landeck
    donorName: 'Landeck',
    fromWalletAddress: '0x659C5827EED31F205876F5A473cdd7e6B6AF1049',
    donorAddress: '0x659C5827EED31F205876F5A473cdd7e6B6AF1049',
    toWalletAddress: '0xd0057c59A091eec3C825fF73F7065020baEE3680',
    // https://giveth.io/project/emergency-relief-fund-for-brazil-floods
    projectId: 3461,
    transactionId:
      '0x12d699a9c3eb3605aebbeeea9453286a16d2772738a837efe36cd4a891f75893',
    currency: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000000',

    // Galactic Giving qfRound
    qfRoundId: 9,
    amount: 0.011389,
    valueUsd: 33.86,
    transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
    // transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1715201051000),
  },

  // https://github.com/Giveth/giveth-dapps-v2/issues/4203

  // https://arbiscan.io/tx/0xd9bf19eb3c09baf79159e772ba0fd824b812d5953a7e2d026a2d65966501c7b3
  {
    // GloDollar
    donorName: 'GloDollar',
    donorAddress: '0x1bbfc95b826693bf17665f36a66ac9c389b7e581',
    fromWalletAddress: '0x1bbfc95b826693bf17665f36a66ac9c389b7e581',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0xd9bf19eb3c09baf79159e772ba0fd824b812d5953a7e2d026a2d65966501c7b3',
    currency: 'USDGLO',
    tokenAddress: '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3',
    amount: 1500,
    valueUsd: 1500,
    transactionNetworkId: NETWORK_IDS.ARBITRUM_MAINNET,
    createdAt: millisecondTimestampToDate(1713273778000),
  },

  // https://etherscan.io/tx/0x4b0b0e7b8137ac68e42ebfa170607e6b59015d3583e7290af081ea974cfd6b10
  {
    // Aragon Project
    donorName: 'Aragon Project',
    donorAddress: '0x124cc44b7119fb592a774f466823f31885b60440',
    fromWalletAddress: '0xD6B270DFEE268B452c86251Fd7e12Db8dE9200FB',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x4b0b0e7b8137ac68e42ebfa170607e6b59015d3583e7290af081ea974cfd6b10',
    currency: 'USDC',
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: 1000,
    valueUsd: 1000,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1696867907000),
  },

  // https://etherscan.io/tx/0x12135b286cbcb71c1c4155ee650613e1840d54619d4d06ae7be77f17bdc4683b
  {
    // Aragon Project
    donorName: 'Aragon Project',
    donorAddress: '0x124cc44b7119fb592a774f466823f31885b60440',
    fromWalletAddress: '0xD6B270DFEE268B452c86251Fd7e12Db8dE9200FB',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x12135b286cbcb71c1c4155ee650613e1840d54619d4d06ae7be77f17bdc4683b',
    currency: 'USDC',
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: 5000,
    valueUsd: 5000,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1689342251000),
  },

  // https://etherscan.io/tx/0x30954cb441cb7b2184e6cd1afc6acbd1318f86a68b669f6bfb2786dd459e2d6c
  {
    // Public Nouns
    donorName: 'Public Nouns',
    donorAddress: '0x553826cb0d0ee63155920f42b4e60aae6607dfcb',
    fromWalletAddress: '0xda04c025F4d8Ac555Fdb3497B197D28FCEcf4d41',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x30954cb441cb7b2184e6cd1afc6acbd1318f86a68b669f6bfb2786dd459e2d6c',
    currency: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    amount: 5,
    valueUsd: 9458.4,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1689897227000),
  },

  // https://etherscan.io/tx/0x10975407db91205cda1e9f9bb288488d215d6d94dfa12b192ffa0cb78893df11
  {
    // Public Nouns
    donorName: 'Public Nouns',
    donorAddress: '0x553826cb0d0ee63155920f42b4e60aae6607dfcb',
    fromWalletAddress: '0xda04c025F4d8Ac555Fdb3497B197D28FCEcf4d41',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0x10975407db91205cda1e9f9bb288488d215d6d94dfa12b192ffa0cb78893df11',
    currency: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    amount: 5,
    valueUsd: 11154.7,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1703626727000),
  },

  // https://etherscan.io/tx/0xa6e68136fdb972597cb795d73059aa5a7eedfe5a84b0af3b0091121231e1529d
  {
    // Jordi Baylina
    donorName: 'Jordi Baylina',
    donorAddress: '0x1DBA1131000664b884A1Ba238464159892252D3a',
    fromWalletAddress: '0x1dba1131000664b884a1ba238464159892252d3a',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    // https://giveth.io/project/giveth-matching-pool-0
    projectId: 1443,
    transactionId:
      '0xa6e68136fdb972597cb795d73059aa5a7eedfe5a84b0af3b0091121231e1529d',
    currency: 'ENS',
    tokenAddress: '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72',
    amount: 110,
    valueUsd: 2739,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1689200507000),
  },
];

export class AddDonationsMannuallyToDb1716549958362
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
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
