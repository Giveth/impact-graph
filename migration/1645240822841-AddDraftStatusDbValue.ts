import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDraftStatusDbValue1645240822841 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const draftedStatus = await queryRunner.query(
      `SELECT * FROM project_status WHERE "name" = 'drafted'`,
    );
    if (draftedStatus.length > 0) {
      return;
    }

    await queryRunner.query(`
            INSERT INTO project_status (symbol, "name", description)
            VALUES ('drafted', 'drafted', 'This project is created as a draft for a potential new project, but can be discarded')
        `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
