import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class addsybilTableEntity1707343258512 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sybil',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'confirmedSybil',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'userId',
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
      'sybil',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'sybil',
      new TableForeignKey({
        columnNames: ['qfRoundId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'qf_round',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('sybil');
    const userForeignKey = table!.foreignKeys.find(
      fk => fk.columnNames.indexOf('userId') !== -1,
    );
    const qfRoundForeignKey = table!.foreignKeys.find(
      fk => fk.columnNames.indexOf('qfRoundId') !== -1,
    );

    if (userForeignKey) {
      await queryRunner.dropForeignKey('sybil', userForeignKey);
    }

    if (qfRoundForeignKey) {
      await queryRunner.dropForeignKey('sybil', qfRoundForeignKey);
    }

    await queryRunner.dropTable('sybil');
  }
}
