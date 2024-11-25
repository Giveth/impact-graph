import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScoreTimestampToUser1732495872789
  implements MigrationInterface
{
  name = 'AddScoreTimestampToUser1732495872789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "passportScoreUpdateTimestamp" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "passportScoreUpdateTimestamp"`,
    );
  }
}
