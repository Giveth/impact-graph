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
import { updateTotalDonationsOfProject } from '../src/services/donationService';
import {
  refreshProjectDonationSummaryView,
  refreshProjectEstimatedMatchingView,
} from '../src/services/projectViewsService';
import { updateProjectStatistics } from '../src/services/projectService';

const millisecondTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

const transactions: (Partial<Donation> & {
  donorName?: string;
  donorAddress?: string;
})[] = [
  // CELO
  // https://celoscan.io/tx/0xe2cda96ad16560556100e09958936dbdd20b0e938b0161a0c78ba23c1e2468ae
  {
    donorName: 'CELO',
    donorAddress: '0x7326E65556775614fc19479051665566bf33068c',
    fromWalletAddress: '0x7326E65556775614fc19479051665566bf33068c',
    toWalletAddress: '0x222921486e5fc244a2158499ba8adde0db3a5a6f',
    projectId: 1443,
    transactionId:
      '0xe2cda96ad16560556100e09958936dbdd20b0e938b0161a0c78ba23c1e2468ae',
    currency: 'USDGLO',
    tokenAddress: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    amount: 10_000,
    valueUsd: 10_000,
    transactionNetworkId: NETWORK_IDS.CELO,
    createdAt: millisecondTimestampToDate(1718632956000),
  },

  // CCN
  // https://celoscan.io/tx/0x6a42695a47779341cb5af537d2d75cb1f66ac7ac4b63305249c55fc45b7792da
  {
    donorName: 'Climate Coordination Network',
    donorAddress: '0xe3F4F3aD70C1190EC480554bbc3Ed30285aE0610',
    fromWalletAddress: '0xe3F4F3aD70C1190EC480554bbc3Ed30285aE0610',
    toWalletAddress: '0x222921486e5fc244a2158499ba8adde0db3a5a6f',
    projectId: 1443,
    transactionId:
      '0x6a42695a47779341cb5af537d2d75cb1f66ac7ac4b63305249c55fc45b7792da',
    currency: 'cUSD',
    tokenAddress: '0x765de816845861e75a25fca122bb6898b8b1282a',
    amount: 10_000,
    valueUsd: 10_000,
    transactionNetworkId: NETWORK_IDS.CELO,
    createdAt: millisecondTimestampToDate(1718809264000),
  },

  // Public Nouns
  // https://etherscan.io/tx/0x97b434979a88f183587975e5bd773037f0959e49e6778288e85eaa6e8349e031
  {
    donorName: 'Public Nouns',
    donorAddress: '0x553826Cb0D0Ee63155920F42b4E60aaE6607DFCB',
    fromWalletAddress: '0xda04c025F4d8Ac555Fdb3497B197D28FCEcf4d41',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    projectId: 1443,
    transactionId:
      '0x97b434979a88f183587975e5bd773037f0959e49e6778288e85eaa6e8349e031',
    currency: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    amount: 5,
    valueUsd: 14_910,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1720147223000),
  },

  // Mask
  // https://etherscan.io/tx/0x4980e0eb628cf55f9914e03afc6bd33d7c92be12c3d402eb66f6ab06806776c0
  {
    donorName: 'Mask',
    donorAddress: '0xfb3879ced5560dc3eb715c7f6d6e75544662f29c',
    fromWalletAddress: '0x1D22D6b41EcE14E2A2c5B4DE0739c0056A05F0ea',
    toWalletAddress: '0x6e8873085530406995170da467010565968c7c62',
    projectId: 1443,
    transactionId:
      '0x4980e0eb628cf55f9914e03afc6bd33d7c92be12c3d402eb66f6ab06806776c0',
    currency: 'MASK',
    tokenAddress: '0x69af81e73a73b40adf4f3d4223cd9b1ece623074',
    amount: 3_333.3,
    valueUsd: 7_066,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: millisecondTimestampToDate(1713354817000),
  },
];

export class AddSponserDonationsToGivbackRound651720771952062
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
      await updateTotalDonationsOfProject(tx.projectId as number);
      await updateProjectStatistics(tx.projectId as number);
    }

    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
