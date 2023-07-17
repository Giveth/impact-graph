import { MigrationInterface, QueryRunner } from 'typeorm';

export class relateQfRoundToDonation1684150255631
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "donation"
            ADD COLUMN "qfRoundId" integer,
            ADD COLUMN "qfRound" integer;
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_qfRoundId" ON "donation" ("qfRoundId");
        `);

    await queryRunner.query(`
            ALTER TABLE "donation" 
            ADD CONSTRAINT "FK_qfRoundId" 
            FOREIGN KEY ("qfRoundId") 
            REFERENCES "qf_round"("id") 
            ON DELETE SET NULL;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "donation" 
            DROP CONSTRAINT "FK_qfRoundId";
        `);

    await queryRunner.query(`
            DROP INDEX "IDX_qfRoundId";
        `);

    await queryRunner.query(`
            ALTER TABLE "donation"
            DROP COLUMN "qfRoundId",
            DROP COLUMN "qfRound";
        `);
  }
}
