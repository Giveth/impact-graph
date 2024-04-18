import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStreamBalanceWarningToUser1712146623379
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "streamBalanceWarning" jsonb DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "streamBalanceWarning"`,
    );
  }
}
