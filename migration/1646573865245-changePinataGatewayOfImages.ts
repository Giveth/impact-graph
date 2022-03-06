import { MigrationInterface, QueryRunner } from 'typeorm';

export class changePinataGatewayOfImages1646573865245
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE
        project
        SET
        image = REPLACE (
          image,
          'gateway.pinata.cloud',
          'giveth.mypinata.cloud'
        );
`,
    );
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

  async down(queryRunner: QueryRunner): Promise<void> {}
}
