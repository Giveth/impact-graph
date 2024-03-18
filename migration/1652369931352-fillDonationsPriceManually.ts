import { MigrationInterface, QueryRunner } from 'typeorm';

// https://github.com/Giveth/giveth-dapps-v2/issues/667#issuecomment-1118470909 ( Exclude DAI and XDAI donations)
const donations = [
  {
    txHash:
      '0x74daa94d383891ff9e487b9c39ebe03be4b774aba071b67c399a95ddd07ceeca',
    amount: 0.037,
    priceUsd: 2857,
  },
  {
    txHash:
      '0xe3747bf42f3e55501a58222d12e6444f716dc89293f0480eceeaed25137680ae',
    amount: 0.001,
    priceUsd: 3392,
  },
  {
    txHash:
      '0x25f6ee66594919957c8230bc20d79264938e4d2e9283ba341c9dab8927289e2d',
    amount: 0.002,
    priceUsd: 2795,
  },
  {
    txHash:
      '0xf8c437a4a90817562dd75e5df4db415eb1e901e767941156922734d60531f7f3',
    amount: 0.003,
    priceUsd: 2694,
  },
  {
    txHash:
      '0xed3901d9d1786ff9aeaaf2af980cbe5ad6122faf35ca52e82fe1e64d85ee1848',
    amount: 0.25,
    priceUsd: 2608,
  },
  {
    txHash:
      '0x0b110057acd12c36b754b2f9963d7310ac8c58ecf4ae237849372c417eba74a7',
    amount: 0.1,
    priceUsd: 2608,
  },
  {
    txHash:
      '0xb3c5a807b3b791c57bb0a5b1fc44d8e1f09b941219e811b9148e57ae01a56427',
    amount: 0.1,
    priceUsd: 17,
  },
  {
    txHash:
      '0x1dafa761b7842e32195d88f1bce33b6373d96479060956c4089f989ca5a6fa66',
    amount: 13,
    priceUsd: 0.00033,
  },
  {
    txHash:
      '0xcd9285c0a7740a12e7acd535cae6e4f9883e9fc3a9f4e967a866fb425df72bb2',
    amount: 0.001963,
    priceUsd: 2572,
  },
  {
    txHash:
      '0x0eb6595097a4dc8c664094e3581162deca61423b7db55e55ea05407fc968f058',
    amount: 0.001,
    priceUsd: 2465,
  },
  {
    txHash:
      '0xac891a5ed2e624baab7dab014c9fec11f2b2a29baace07519b98c569160e78b4',
    amount: 0.0239672,
    priceUsd: 3315,
  },
  {
    txHash:
      '0x78638a367348d5d51af475db839ef6fbfe950d6978495fb571087b6d94aefea2',
    amount: 0.01,
    priceUsd: 3056,
  },
  {
    txHash:
      '0x04f2f0f0599a478ec16d3fc47c44545960d959b7a1155d3043044603f3ccf79d',
    amount: 200,
    priceUsd: 0.13,
  },
  {
    txHash:
      '0x491b02d2ddf54a074a68a18e806f1d4a47a4c9089a8530831a966909a6d3f124',
    amount: 1111,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0xe4ba7d9ffa5a0aa3f64c3ee4a8aa11c504ed5703430df756c0378f49694ec9a0',
    amount: 3333,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0xaa894ee051806bce1115af28898477401de1775f8d675736ca9fe26d038ee9e0',
    amount: 1111,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0x5963e81496eef5e0f543ba63d8e2fc89d1b8892bbe1a4865ad3652cadec7fc16',
    amount: 1111,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0x64e8c6f8c7f468ff958b839dfa8b52e15a5236738163b8168cd1e515e78bc333',
    amount: 3333,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0x9d51d0ccb8813b3f68f7b75ff0ec9347f25691ab021fb6ab46a90afc6e3a7403',
    amount: 1111,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0x284c46e823cf5610b57c1a3707a228fce74bdf5211940b9871792af1d024f2b8',
    amount: 1111,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0xbf60711627bf04682dbf54057d3a3b1e4bb0bcee3033a436a3365917b7a67691',
    amount: 1111,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0x16abd0b6e92573103c363bb893e4804d604874319b73f2900997e66982caa265',
    amount: 1111,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0x588c9a68523403fc547125e62cdad4f9ba14c5bb19ee696b6fe2dd0e6de3a150',
    amount: 1111,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0xf829e5506f7fcb71c739a90f0995d3b4e561363d48ed212764ad7af1fc7c5768',
    amount: 1111,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0xf5388e9abc23c48590989866053e65b5e6862dbee4e83ef74ae9d55a051fef91',
    amount: 50,
    priceUsd: 0.12,
  },
  {
    txHash:
      '0x3c68bb5e4f4dd2eeef9f03336d4b3bee8070e08f5c5f14beaec9cc00457b5436',
    amount: 7.477,
    priceUsd: 0.11,
  },
  {
    txHash:
      '0x3b049fbd7cb4535eeec8925278cf3fcccc5984dc99c596e773b7710e6875f293',
    amount: 26.98,
    priceUsd: 0.11,
  },
  {
    txHash:
      '0x31f915e1c3b43002d61f5fb1e6d7aea85c83b50c1e517bd9b5629845cc87a62c',
    amount: 15,
    priceUsd: 0.11,
  },
  {
    txHash:
      '0xfab82eb998dfe454701ea14ee5307268c4efacecaac38768c0fb16dfaffc11a0',
    amount: 20,
    priceUsd: 0.11,
  },
  {
    txHash:
      '0xe99f0133e1cab9c745c10dcfbfc532e6359510df0b2051866440e227b94fc366',
    amount: 10,
    priceUsd: 0.08,
  },
  {
    txHash:
      '0xa76868833373f7b9ad504f3b20d69115b01090f6af4d5aa26137b4edccf2a45d',
    amount: 10,
    priceUsd: 0.08,
  },
  {
    txHash:
      '0x16aec2b140b31e465ed2410d7a7c076102ac7f007f12448a77f55ade9bee5039',
    amount: 10,
    priceUsd: 0.08,
  },
  {
    txHash:
      '0x389560cff6842bb16855916b2dbc38d585d6bc5d45fc77d50db15bc7374b4a05',
    amount: 0.025,
    priceUsd: 1810,
  },
  {
    txHash:
      '0x2fbaf4c3466f4677cfbc6131d102f7f233892f5eb6a6261fd8d28b08ee8a1e26',
    amount: 0.07,
    priceUsd: 400,
  },
  {
    txHash:
      '0x20375b629698d7e07103baf44838e1cb4fd26c851923bb39d81f7f3998061511',
    amount: 1500.001,
    priceUsd: 0.08,
  },
  {
    txHash:
      '0xcf4395bf72f884ff9db555733f04277caf959ed7198a58baea11dc1cb88cff86',
    amount: 200,
    priceUsd: 0.175,
  },
];

export class fillDonationsPriceManually1652369931352
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const donationTableExists = await queryRunner.hasTable('donation');
    if (!donationTableExists) {
      return;
    }
    for (const donation of donations) {
      await queryRunner.query(`
                     UPDATE donation
                     SET "priceUsd" = ${donation.priceUsd},
                         "valueUsd" = ${donation.priceUsd * donation.amount}
                     WHERE LOWER("transactionId") = '${donation.txHash.toLowerCase()}'
            `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const donationTableExists = await queryRunner.hasTable('donation');
    if (!donationTableExists) {
      return;
    }
    for (const donation of donations) {
      await queryRunner.query(`
                     UPDATE donation
                     SET "priceUsd" = NULL,
                         "valueUsd" = NULL
                     WHERE LOWER("transactionId") = '${donation.txHash.toLowerCase()}'
            `);
    }
  }
}
