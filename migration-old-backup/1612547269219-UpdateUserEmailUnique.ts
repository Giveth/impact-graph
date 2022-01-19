import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class UpdateUserEmailUnique1612547269219 implements MigrationInterface {
  name = 'UpdateUserEmailUnique1612547269219';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`COMMENT ON COLUMN "user"."email" IS NULL`);
    // await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22"`);
    await queryRunner.dropUniqueConstraint(
      'user',
      new TableUnique({ columnNames: ['email'] }),
    );
    // staging await queryRunner.dropUniqueConstraint('user', 'unique_email_address')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createUniqueConstraint(
      'user',
      new TableUnique({ columnNames: ['email'] }),
    );
    await queryRunner.query(`COMMENT ON COLUMN "user"."email" IS NULL`);
  }
}
