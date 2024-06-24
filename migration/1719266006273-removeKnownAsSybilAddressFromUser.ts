import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveKnownAsSybilAddressFromUser1719266006273
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.user DROP COLUMN "knownAsSybilAddress";
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
