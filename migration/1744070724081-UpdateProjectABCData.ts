import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateProjectABCData1744070724081 implements MigrationInterface {
  name = 'UpdateProjectABCData1744070724081';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update AKA project
    await queryRunner.query(`
      UPDATE project
      SET abc = jsonb_set(
        jsonb_set(
          abc::jsonb,
          '{orchestratorAddress}',
          '"0x097Fea9749186998A4D0835E101eF786484528b8"'
        ),
        '{fundingManagerAddress}',
        '"0x9776b3A8E233e1Bc1ad24985BaEcFDDd57D47c56"'
      )
      WHERE abc->>'tokenTicker' = 'AKA'
    `);

    // Update BEAST project
    await queryRunner.query(`
      UPDATE project
      SET abc = jsonb_set(
        jsonb_set(
          abc::jsonb,
          '{orchestratorAddress}',
          '"0x8b17B8B5E09db4D0bB392F948eCe3236324a0e6b"'
        ),
        '{fundingManagerAddress}',
        '"0x5B34dE32e40842e2e1D0135f0F52C467Ad8b2baB"'
      )
      WHERE abc->>'tokenTicker' = 'BEAST'
    `);

    // Update MELODEX project
    await queryRunner.query(`
      UPDATE project
      SET abc = jsonb_set(
        jsonb_set(
          abc::jsonb,
          '{orchestratorAddress}',
          '"0x8d38fC1Cb76eb3AC349d4c212599686Cb0771AF1"'
        ),
        '{fundingManagerAddress}',
        '"0xa2a1efb352166d6B38e2F1C24A913390a1367435"'
      )
      WHERE abc->>'tokenTicker' = 'MELS'
    `);

    // Update XADE project
    await queryRunner.query(`
      UPDATE project
      SET abc = jsonb_set(
        jsonb_set(
          abc::jsonb,
          '{orchestratorAddress}',
          '"0xebF76b3Af39fF89a8Bf6fcB3F3beeaaCc0fbd0F8"'
        ),
        '{fundingManagerAddress}',
        '"0x1d4fa4979BE3638D46D61e125f992dB703bC3173"'
      )
      WHERE abc->>'tokenTicker' = 'XADE'
    `);

    // Update GRAND TIMELINE project
    await queryRunner.query(`
      UPDATE project
      SET abc = jsonb_set(
        jsonb_set(
          abc::jsonb,
          '{orchestratorAddress}',
          '"0x26424d7a425b7607B53705D4e21fa22Fb7F69166"'
        ),
        '{fundingManagerAddress}',
        '"0x9d2720d1Bb13F8F5aC51fc32c0a9742A3DD101Be"'
      )
      WHERE abc->>'tokenTicker' = 'GRNDT'
    `);

    // Update PRISMO project
    await queryRunner.query(`
      UPDATE project
      SET abc = jsonb_set(
        jsonb_set(
          abc::jsonb,
          '{orchestratorAddress}',
          '"0xa2E1553d0257ae5a4a4d552FeAc3CA6Ec4754559"'
        ),
        '{fundingManagerAddress}',
        '"0xaBAb922f048aa22515c561c5c71f3ABD05F0B938"'
      )
      WHERE abc->>'tokenTicker' = 'PRSM'
    `);

    // Update CITIZEN project
    await queryRunner.query(`
      UPDATE project
      SET abc = jsonb_set(
        jsonb_set(
          abc::jsonb,
          '{orchestratorAddress}',
          '"0x72f38B35D961A893a80726b9dfe17849a19FD085"'
        ),
        '{fundingManagerAddress}',
        '"0xE1B18FE51289627C22944aC0A8A22b605Fcc21DA"'
      )
      WHERE abc->>'tokenTicker' = 'CTZN'
    `);

    // Update X23AI project
    await queryRunner.query(`
      UPDATE project
      SET abc = jsonb_set(
        jsonb_set(
          abc::jsonb,
          '{orchestratorAddress}',
          '"0x81D2492bDb00C112C59Bf171D9c1e3350454Edc0"'
        ),
        '{fundingManagerAddress}',
        '"0x4b2502ad254855AC83990998695c6fD16c2CeeD9"'
      )
      WHERE abc->>'tokenTicker' = 'X23'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No down migration needed
  }
}
