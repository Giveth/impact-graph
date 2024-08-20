import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailConfirmationFieldsToUserTable1724112704036
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'emailConfirmed',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'emailConfirmationSent',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'emailConfirmationSentAt',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'emailConfirmedAt',
        type: 'timestamptz',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'emailConfirmed');
    await queryRunner.dropColumn('user', 'emailConfirmationSent');
    await queryRunner.dropColumn('user', 'emailConfirmationSentAt');
    await queryRunner.dropColumn('user', 'emailConfirmedAt');
  }
}
