import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrivadoRequestIdsToUser1725289755593
  implements MigrationInterface
{
  name = 'AddPrivadoRequestIdsToUser1725289755593';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "privadoVerifiedRequestIds" integer array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "privadoVerifiedRequestIds"`,
    );
  }
}
