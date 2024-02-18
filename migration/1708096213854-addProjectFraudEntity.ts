import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class addProjectFraudEntity1708096213854 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'project_fraud',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'confirmedFraud',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'projectId',
            type: 'int',
          },
          {
            name: 'qfRoundId',
            type: 'int',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'project_fraud',
      new TableForeignKey({
        columnNames: ['projectId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'project',
      }),
    );

    await queryRunner.createForeignKey(
      'project_fraud',
      new TableForeignKey({
        columnNames: ['qfRoundId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'qf_round',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('project_fraud');
    const projectForeignKey = table!.foreignKeys.find(
      fk => fk.columnNames.indexOf('projectId') !== -1,
    );
    const qfRoundForeignKey = table!.foreignKeys.find(
      fk => fk.columnNames.indexOf('qfRoundId') !== -1,
    );

    if (projectForeignKey) {
      await queryRunner.dropForeignKey('project_fraud', projectForeignKey);
    }

    if (qfRoundForeignKey) {
      await queryRunner.dropForeignKey('project_fraud', qfRoundForeignKey);
    }

    await queryRunner.dropTable('project_fraud');
  }
}
