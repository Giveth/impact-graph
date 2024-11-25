import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScoreTimestampToUser1732494017630
  implements MigrationInterface
{
  name = 'AddScoreTimestampToUser1732494017630';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "passportScoreUpdateTimestamp" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "passportScoreUpdateTimestamp"`,
    );
  }
}
