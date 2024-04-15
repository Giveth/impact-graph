import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserNewRoleFqManager1712853017092 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // add enum qfManager to user table column role
    await queryRunner.query(
      `
      ALTER TYPE user_role_enum ADD VALUE 'qfManager';
      ALTER TABLE "user" ALTER COLUMN "role" TYPE user_role_enum USING "role"::text::user_role_enum;
      ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'restricted';
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // remove enum qfManager from user table column role
    await queryRunner.query(
      `
      ALTER TYPE user_role_enum DROP VALUE 'qfManager';
      ALTER TABLE "user" ALTER COLUMN "role" TYPE user_role_enum USING "role"::text::user_role_enum;
      ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'restricted';
      `,
    );
  }
}
