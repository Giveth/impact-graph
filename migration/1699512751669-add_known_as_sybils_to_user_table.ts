import { MigrationInterface, QueryRunner } from 'typeorm';

export class addKnownAsSybilsToUserTable1699512751669
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DO $$
              BEGIN
                BEGIN
                    ALTER TABLE public.user ADD COLUMN "knownAsSybilAddress" boolean NOT NULL DEFAULT false;
                EXCEPTION
                    WHEN duplicate_column THEN 
                        -- Handle the error, or just do nothing to skip adding the column.
                        RAISE NOTICE 'Column "isStableCoin" already exists in "public.user".';
                END;
              END $$;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE public.user
            DROP COLUMN "knownAsSybilAddress";
        `);
  }
}
