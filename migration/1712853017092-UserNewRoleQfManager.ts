import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserNewRoleQfManager1712853017092 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // add enum qfManager to user table column role
    await queryRunner.query(
      `DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_enum
              WHERE pg_enum.enumtypid = 'user_role_enum'::regtype 
                  AND pg_enum.enumlabel = 'qfManager'
            ) THEN
                BEGIN
                    EXECUTE 'ALTER TYPE user_role_enum ADD VALUE ''qfManager''';
                END;
            END IF;
        END $$;
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(''); // no need to remove enum value
  }
}
