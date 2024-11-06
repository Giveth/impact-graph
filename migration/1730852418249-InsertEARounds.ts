import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertEARounds1730852418249 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "early_access_round" (
        "roundNumber", "startDate", "endDate", "roundUSDCapPerProject", "roundUSDCapPerUserPerProject", "tokenPrice", "isBatchMintingExecuted"
      ) VALUES
        (1, '2024-11-06 12:00:00', '2024-11-11 12:00:00', 100000, 5000, null, false),
        (2, '2024-11-11 12:00:00', '2024-11-16 12:00:00', 200000, 10000, null, false),
        (3, '2024-11-16 12:00:00', '2024-11-21 12:00:00', 200000, 10000, null, false)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "early_access_round" WHERE "roundNumber" IN (1, 2, 3)
    `);
  }
}
