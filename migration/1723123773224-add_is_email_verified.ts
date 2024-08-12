import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsEmailVerified1723123773224 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'isEmailVerified',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'isEmailVerified');
  }
}
