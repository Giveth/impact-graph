import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScoreTimestampToUser1732582914845
  implements MigrationInterface
{
  name = 'AddScoreTimestampToUser1732582914845';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "passportScoreUpdateTimestamp" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "passportScoreUpdateTimestamp"`,
    );
  }
}
