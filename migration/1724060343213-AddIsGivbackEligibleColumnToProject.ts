import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsGivbackEligibleColumnToProject1637168932304
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new column
    await queryRunner.addColumn(
      'project',
      new TableColumn({
        name: 'isGivbackEligible',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the isGivbackEligible column
    await queryRunner.dropColumn('project', 'isGivbackEligible');
  }
}
