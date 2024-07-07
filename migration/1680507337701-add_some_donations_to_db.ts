import { MigrationInterface, QueryRunner } from 'typeorm';
import moment from 'moment';
import config from '../src/config';
import { Donation } from '../src/entities/donation';
import { NETWORK_IDS } from '../src/provider';

// For seeing donations detail you can see this message ( if you have access to channel)
// https://discord.com/channels/679428761438912522/928813033600475207/1089868809302724618

const fromWalletAddress = '0x839395e20bbb182fa440d08f850e6c7a8f6f0780';
const transactions: Partial<Donation>[] = [
  // This is 6 donations in xDAI and GIV: https://gnosisscan.io/tx/0x7c56dce8d49799d11de5f2c8b9637564c9b12fe6638de9226ff6bd698beed8d9/
  {
    fromWalletAddress,
    toWalletAddress: '0x236daa98f115caa9991a3894ae387cdc13eaad1b',
    projectId: 251,
    transactionId:
      '0x7c56dce8d49799d11de5f2c8b9637564c9b12fe6638de9226ff6bd698beed8d9',
    currency: 'XDAI',
    amount: 589.166666666,
    valueUsd: 589.166666666,
    transactionNetworkId: NETWORK_IDS.XDAI,
    createdAt: new Date(1679915250000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x924393ea45da424643c89f99bfdfd707b1fed9ae',
    projectId: 2341,
    transactionId:
      '0x7c56dce8d49799d11de5f2c8b9637564c9b12fe6638de9226ff6bd698beed8d9',
    currency: 'XDAI',
    amount: 589.166666666,
    valueUsd: 589.166666666,
    transactionNetworkId: NETWORK_IDS.XDAI,
    createdAt: new Date(1679915250000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xc1460588cA2BcAEB28c80327413e91655505A784',
    projectId: 2351,
    transactionId:
      '0x7c56dce8d49799d11de5f2c8b9637564c9b12fe6638de9226ff6bd698beed8d9',
    currency: 'XDAI',
    amount: 589.166666666,
    valueUsd: 589.166666666,
    transactionNetworkId: NETWORK_IDS.XDAI,
    createdAt: new Date(1679915250000),
  },

  {
    fromWalletAddress,
    toWalletAddress: '0x236daa98f115caa9991a3894ae387cdc13eaad1b',
    projectId: 251,
    transactionId:
      '0x7c56dce8d49799d11de5f2c8b9637564c9b12fe6638de9226ff6bd698beed8d9',
    currency: 'GIV',
    amount: 1404.840270666,
    valueUsd: 63.9,
    transactionNetworkId: NETWORK_IDS.XDAI,
    createdAt: new Date(1679915250000),
  },

  {
    fromWalletAddress,
    toWalletAddress: '0x924393ea45da424643c89f99bfdfd707b1fed9ae',
    projectId: 2341,
    transactionId:
      '0x7c56dce8d49799d11de5f2c8b9637564c9b12fe6638de9226ff6bd698beed8d9',
    currency: 'GIV',
    amount: 1404.840270666,
    valueUsd: 63.9,
    transactionNetworkId: NETWORK_IDS.XDAI,
    createdAt: new Date(1679915250000),
  },

  {
    fromWalletAddress,
    toWalletAddress: '0xc1460588cA2BcAEB28c80327413e91655505A784',
    projectId: 2351,
    transactionId:
      '0x7c56dce8d49799d11de5f2c8b9637564c9b12fe6638de9226ff6bd698beed8d9',
    currency: 'GIV',
    amount: 1404.840270666,
    valueUsd: 63.9,
    transactionNetworkId: NETWORK_IDS.XDAI,
    createdAt: new Date(1679915250000),
  },

  // This is 15 donations on mainnet: https://etherscan.io/tx/0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd
  {
    fromWalletAddress,
    toWalletAddress: '0x236daa98f115caa9991a3894ae387cdc13eaad1b',
    projectId: 251,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'ETH',
    amount: 0.211,
    valueUsd: 377.97,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x924393ea45da424643c89f99bfdfd707b1fed9ae',
    projectId: 2341,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'ETH',
    amount: 0.211,
    valueUsd: 377.97,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xc1460588cA2BcAEB28c80327413e91655505A784',
    projectId: 2351,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'ETH',
    amount: 0.211,
    valueUsd: 377.97,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },

  {
    fromWalletAddress,
    toWalletAddress: '0x236daa98f115caa9991a3894ae387cdc13eaad1b',
    projectId: 251,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'CRV',
    amount: 166.666666,
    valueUsd: 151.26,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x924393ea45da424643c89f99bfdfd707b1fed9ae',
    projectId: 2341,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'CRV',
    amount: 166.666666,
    valueUsd: 151.26,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xc1460588cA2BcAEB28c80327413e91655505A784',
    projectId: 2351,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'CRV',
    amount: 166.666666,
    valueUsd: 151.26,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },

  {
    fromWalletAddress,
    toWalletAddress: '0x236daa98f115caa9991a3894ae387cdc13eaad1b',
    projectId: 251,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'GTC',
    amount: 6.6666,
    valueUsd: 11.87,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x924393ea45da424643c89f99bfdfd707b1fed9ae',
    projectId: 2341,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'GTC',
    amount: 6.6666,
    valueUsd: 11.87,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xc1460588cA2BcAEB28c80327413e91655505A784',
    projectId: 2351,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'GTC',
    amount: 6.6666,
    valueUsd: 11.87,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },

  {
    fromWalletAddress,
    toWalletAddress: '0x236daa98f115caa9991a3894ae387cdc13eaad1b',
    projectId: 251,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'USDC',
    amount: 793.2,
    valueUsd: 793.2,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x924393ea45da424643c89f99bfdfd707b1fed9ae',
    projectId: 2341,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'USDC',
    amount: 793.2,
    valueUsd: 793.2,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xc1460588cA2BcAEB28c80327413e91655505A784',
    projectId: 2351,
    transactionId:
      '0x7d62181f89d5abde19d4159a59a5e2bfee17860207b0e5fb026e93d49cc98fdd',
    currency: 'USDC',
    amount: 793.2,
    valueUsd: 793.2,
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    createdAt: new Date(1679915447000),
  },

  // The matic one has 6 donations:  https://polygonscan.com/tx/0x7e34422db03a384def1d7eb69d95e063b84fb025a39d6cce42cefd54a903e35f

  {
    fromWalletAddress,
    toWalletAddress: '0x236daa98f115caa9991a3894ae387cdc13eaad1b',
    projectId: 251,
    transactionId:
      '0x7e34422db03a384def1d7eb69d95e063b84fb025a39d6cce42cefd54a903e35f',
    currency: 'MATIC',
    amount: 5.0667,
    valueUsd: 5.32,
    transactionNetworkId: NETWORK_IDS.POLYGON,
    createdAt: new Date(1679915779000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x924393ea45da424643c89f99bfdfd707b1fed9ae',
    projectId: 2341,
    transactionId:
      '0x7e34422db03a384def1d7eb69d95e063b84fb025a39d6cce42cefd54a903e35f',
    currency: 'MATIC',
    amount: 5.0667,
    valueUsd: 5.32,
    transactionNetworkId: NETWORK_IDS.POLYGON,
    createdAt: new Date(1679915779000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xc1460588cA2BcAEB28c80327413e91655505A784',
    projectId: 2351,
    transactionId:
      '0x7e34422db03a384def1d7eb69d95e063b84fb025a39d6cce42cefd54a903e35f',
    currency: 'MATIC',
    amount: 5.0667,
    valueUsd: 5.32,
    transactionNetworkId: NETWORK_IDS.POLYGON,
    createdAt: new Date(1679915779000),
  },

  {
    fromWalletAddress,
    toWalletAddress: '0x236daa98f115caa9991a3894ae387cdc13eaad1b',
    projectId: 251,
    transactionId:
      '0x7e34422db03a384def1d7eb69d95e063b84fb025a39d6cce42cefd54a903e35f',
    currency: 'WETH',
    amount: 0.001667,
    valueUsd: 3.01,
    transactionNetworkId: NETWORK_IDS.POLYGON,
    createdAt: new Date(1679915779000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0x924393ea45da424643c89f99bfdfd707b1fed9ae',
    projectId: 2341,
    transactionId:
      '0x7e34422db03a384def1d7eb69d95e063b84fb025a39d6cce42cefd54a903e35f',
    currency: 'WETH',
    amount: 0.001667,
    valueUsd: 3.01,
    transactionNetworkId: NETWORK_IDS.POLYGON,
    createdAt: new Date(1679915779000),
  },
  {
    fromWalletAddress,
    toWalletAddress: '0xc1460588cA2BcAEB28c80327413e91655505A784',
    projectId: 2351,
    transactionId:
      '0x7e34422db03a384def1d7eb69d95e063b84fb025a39d6cce42cefd54a903e35f',
    currency: 'WETH',
    amount: 0.001667,
    valueUsd: 3.01,
    transactionNetworkId: NETWORK_IDS.POLYGON,
    createdAt: new Date(1679915779000),
  },
];

export class addSomeDonationsToDb1680507337701 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;

    if (environment !== 'production') {
      // eslint-disable-next-line no-console
      console.log('We want to create these donations in production DB');
      return;
    }
    // await queryRunner.query(`
    //             INSERT INTO public.user ( "walletAddress", role,"loginType", name)
    //             VALUES('${fromWalletAddress}', 'restricted','wallet', 'A Gnosis safe wallet');
    //           `);
    const user = (
      await queryRunner.query(`SELECT * FROM public.user
        WHERE "walletAddress"='${fromWalletAddress}'`)
    )[0];

    for (const tx of transactions) {
      // const projectAddress = await findRelatedAddressByWalletAddress(
      //   tx.toWalletAddress as string,
      // );
      // if (!projectAddress || !projectAddress.isRecipient) {
      //   throw new Error(
      //     `Couldn't find project with this recipient Address: ${tx?.toWalletAddress}`,
      //   );
      // }
      // Set false for isTokenEligibleForGivback, isProjectVerified because Griff mentioned we dont want to pay givback for them
      try {
        const createdAt = moment(tx.createdAt).format('YYYY-MM-DD HH:mm:ss');
        await queryRunner.query(`
           INSERT INTO donation ("toWalletAddress", "projectId", "fromWalletAddress", "userId", amount, currency, "transactionId", "transactionNetworkId", anonymous, "valueUsd", status, "segmentNotified", "isTokenEligibleForGivback", "isProjectVerified", "createdAt")
           VALUES ('${tx.toWalletAddress}', ${tx.projectId}, '${tx.fromWalletAddress}', ${user.id}, ${tx.amount}, '${tx.currency}', '${tx.transactionId}', ${tx.transactionNetworkId}, false, ${tx.valueUsd}, 'verified', true, false, false, '${createdAt}');
                `);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('Couldnt create donation error: ', e.message);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const tx of transactions) {
      await queryRunner.query(`
                 DELETE FROM donation
                 WHERE "transactionId"='${tx.transactionId}'
                `);
    }
  }
}
