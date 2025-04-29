import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkipVerificationFieldToUser1745946415337
  implements MigrationInterface
{
  name = 'AddSkipVerificationFieldToUser1745946415337';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "skipVerification" boolean NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "skipVerification"`,
    );
  }
}
