import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCauseStatusAndAddListingStatus1748376323567
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update cause_status_enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cause_status_enum') THEN
          ALTER TYPE cause_status_enum RENAME TO cause_status_enum_old;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      CREATE TYPE cause_status_enum AS ENUM (
        'rejected', 'pending', 'clarification', 'verification', 'active', 'deactive', 'cancelled', 'drafted'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE cause ALTER COLUMN status DROP DEFAULT;
      ALTER TABLE cause ALTER COLUMN status TYPE cause_status_enum USING status::text::cause_status_enum;
      ALTER TABLE cause ALTER COLUMN status SET DEFAULT 'pending';
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS cause_status_enum_old;
    `);

    // Add listing_status_enum
    await queryRunner.query(`
      CREATE TYPE listing_status_enum AS ENUM ('Not Reviewed', 'Listed', 'Not Listed');
    `);
    await queryRunner.query(`
      ALTER TABLE cause ADD COLUMN IF NOT EXISTS "listingStatus" listing_status_enum NOT NULL DEFAULT 'Not Reviewed';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove listingStatus column and enum
    await queryRunner.query(`
      ALTER TABLE cause DROP COLUMN IF EXISTS "listingStatus";
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS listing_status_enum;
    `);

    // First, map expanded status values to original ones
    await queryRunner.query(`
      UPDATE cause
      SET status = CASE
        WHEN status IN ('active') THEN 'active'
        WHEN status IN ('deactive', 'cancelled', 'drafted', 'rejected') THEN 'deactivated'
        ELSE 'active' -- Default mapping for pending, clarification, verification
      END
      WHERE status NOT IN ('active', 'deactivated');
    `);

    // Revert cause_status_enum to previous (active, deactivated)
    await queryRunner.query(`
      CREATE TYPE cause_status_enum_old AS ENUM ('active', 'deactivated');
    `);
    await queryRunner.query(`
      ALTER TABLE cause ALTER COLUMN status DROP DEFAULT;
      ALTER TABLE cause ALTER COLUMN status TYPE cause_status_enum_old USING status::text::cause_status_enum_old;
      ALTER TABLE cause ALTER COLUMN status SET DEFAULT 'active';
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS cause_status_enum;
      ALTER TYPE cause_status_enum_old RENAME TO cause_status_enum;
    `);
  }
}
