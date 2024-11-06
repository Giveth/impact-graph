import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertQAccRound1730852760371 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "qf_round" (
        "roundNumber",
        "name",
        "title",
        "description",
        "slug",
        "beginDate",
        "endDate",
        "tokenPrice",
        "roundUSDCapPerProject",
        "roundUSDCloseCapPerProject",
        "roundUSDCapPerUserPerProject",
        "isBatchMintingExecuted",
        "isActive",
        "allocatedFund",
        "minimumPassportScore"
      ) VALUES (
        1,
        'QAcc first round',
        'First QAcc round',
        'This is the first QAcc round',
        'round-1',
        '2024-11-25 12:00:00',
        '2024-12-09 12:00:00',
        NULL,
        1000000,
        1050000,
        2500,
        false,
        true,
        1000000,
        0
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "qf_round" WHERE "roundNumber" = 1
    `);
  }
}
