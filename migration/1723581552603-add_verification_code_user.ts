import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVerificationCodeUser1723581552603
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'verificationCode',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'verificationCode');
  }
}
