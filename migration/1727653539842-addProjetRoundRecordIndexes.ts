import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjetRoundRecordIndexes1727653539842
  implements MigrationInterface
{
  name = 'AddProjetRoundRecordIndexes1727653539842';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b699d2017f3b16284b14ff5b70" ON "project_round_record" ("projectId", "earlyAccessRoundId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5344399cbfd0d35e34f67b3e89" ON "project_round_record" ("projectId", "qfRoundId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5344399cbfd0d35e34f67b3e89"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b699d2017f3b16284b14ff5b70"`,
    );
  }
}
