import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSlugLowerCase1615311053918 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE project SET slug = LOWER(slug)`);
    await queryRunner.query(
      `update project set "statusId" = 5 where "statusId" is null;`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
