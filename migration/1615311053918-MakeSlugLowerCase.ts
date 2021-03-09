import { MigrationInterface, QueryRunner } from 'typeorm'

export class MakeSlugLowerCase1615311053918 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE project SET slug = LOWER(slug)`)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {}
}
