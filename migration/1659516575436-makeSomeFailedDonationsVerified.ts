import { MigrationInterface, QueryRunner } from 'typeorm';

export class makeSomeFailedDonationsVerified1659516575436
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const donationTableExists = await queryRunner.hasTable('donation');
    if (!donationTableExists) {
      return;
    }
    /**
         * With below query I found donations that got failed through not finding receipt of them
         * I checked them one by one in blockscout and saw all of them are valid, so I wrote this migration the make them verified

             SELECT "fromWalletAddress","toWalletAddress", "amount","currency","valueUsd","transactionId" FROM donation
             WHERE status='failed' AND  "verifyErrorMessage"='Transaction status is failed in network'
             ORDER BY "valueUsd" DESC
         */
    await queryRunner.query(
      `
                UPDATE donation SET status = 'verified', "verifyErrorMessage"='verified manually'
                WHERE "transactionId" in (
                  '0x9d827f3ff0a83fb4e57c274bd4a220465c8c3d2f8b32420ced5f0165b3b60a14',
                  '0x6acdcefa730f18e85f9777e60fde138c4d7ecb299d13d0c491c16e1e5f68f974',
                  '0xc6cfac17ba43262b8465b7bc075448d5f6c0b63ca13d280687f63da73776a079',
                  '0xeba5cb6aaaf2ff10edccca7ebaa72e97d15588197125aa33f14ff22723846c3f',
                  '0x22689f5b34933306a9627a2903d655b10a6fa3aee686e41452c32545c4a5b982',
                  '0xc628c46fa036a05407869c665c2cb88a6eedb9d792da95959ae402f2ca4c1070',
                  '0xee21ae3c8d5667826cc0f359fb34f383276a7e9217a9db63d628e6b364c3aa31',
                  '0x560d5b53a3d4eb344813f3a99378dcbddcfdf2adc46695d21183b10c92fb3ab3',
                  '0xf3deba2952560580cc82332b126a1ed389aca77f3f8a2079a1197ed65c09bbd5',
                  '0xf2dd2c089a6564fa7794efd8199eed3965ff1fd54acb123e74a4ae133246594f',
                  '0xf35f6312891f710af164f6e9501ca8c428d54933a754f40ae56e12c9bc8950d4',
                  '0x7c35dc73ba2962fa77213c2a5ff5ade2887674be51d4ed17f5ada8693930dbd1',
                  '0x0b3ff3c0cdc6dc33ea55aba42884d0670797aad7e2d9d6151b9fc668ea1f028c',
                  '0x254abb0331cbef3e4d28eb878256c8f3e635ecfadbad4cc3cecf2a29fc01b46b',
                  '0x150ad911387f17ed540fd75e03acebbff8cebf4be54174c6bfd80e1a364d9972',
                  '0x0e1271d55a536ad78ea07b75e46c770abb9367daae4e35337b1d10b8e10c2544',
                  '0x410796933522fdab4e909e53bc3c825e94ca0afb8bed12ee9b34dc82bfa31bd2'
                  )
              `,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
