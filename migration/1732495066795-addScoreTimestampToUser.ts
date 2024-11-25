import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScoreTimestampToUser1732495066795
  implements MigrationInterface
{
  name = 'AddScoreTimestampToUser1732495066795';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "passportScoreUpdateTimestamp" bigint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "passportScoreUpdateTimestamp"`,
    );
  }
}
