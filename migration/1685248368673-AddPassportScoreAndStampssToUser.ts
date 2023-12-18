import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPassportScoreAndStampssToUser1685248368673
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'passportStamps',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'passportScore',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'passportStamps');
    await queryRunner.dropColumn('user', 'passportScore');
  }
}
