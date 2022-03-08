import { MigrationInterface, QueryRunner } from 'typeorm';

export class changePinataGatewayOfImages1646573865245
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');
    if (projectTableExists) {
      await queryRunner.query(
        `
        UPDATE
        project
        SET
        image = REPLACE (
          image,
          'gateway.pinata.cloud',
          'giveth.mypinata.cloud'
        );
`,
      );
    }

    const userTableExists = await queryRunner.hasTable('user');
    if (userTableExists) {
      await queryRunner.query(
        `UPDATE
        public."user"
        SET
        avatar = REPLACE (
        avatar,
        'gateway.pinata.cloud',
        'giveth.mypinata.cloud'
);
`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');
    if (projectTableExists) {
      await queryRunner.query(
        `
        UPDATE
        project
        SET
        image = REPLACE (
          image,
          'giveth.mypinata.cloud',
          'gateway.pinata.cloud'
        );
`,
      );
    }

    const userTableExists = await queryRunner.hasTable('user');
    if (userTableExists) {
      await queryRunner.query(
        `UPDATE
        public."user"
        SET
        avatar = REPLACE (
        avatar,
        'giveth.mypinata.cloud',
        'gateway.pinata.cloud'
);
`,
      );
    }
  }
}
