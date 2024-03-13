import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class AddReferredTableRelation1683764388981
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Create referred_event table
    const referredEventTableExists =
      await queryRunner.hasTable('referred_event');

    if (!referredEventTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'referred_event',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'startTime',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'referrerId',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'isDonorLinkedToReferrer',
              type: 'boolean',
              default: false,
              isNullable: false,
            },
            {
              name: 'isDonorClickEventSent',
              type: 'boolean',
              default: false,
              isNullable: false,
            },
            {
              name: 'userId',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );

      await queryRunner.createForeignKey(
        'referred_event',
        new TableForeignKey({
          columnNames: ['userId'],
          referencedTableName: 'user',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      await queryRunner.addColumn(
        'user',
        new TableColumn({
          name: 'chainvineId',
          type: 'varchar',
          isNullable: true,
        }),
      );

      await queryRunner.addColumn(
        'user',
        new TableColumn({
          name: 'wasReferred',
          type: 'boolean',
          default: false,
          isNullable: true,
        }),
      );

      await queryRunner.addColumn(
        'user',
        new TableColumn({
          name: 'isReferrer',
          type: 'boolean',
          default: false,
          isNullable: true,
        }),
      );

      await queryRunner.addColumn(
        'user',
        new TableColumn({
          name: 'referredEventId',
          type: 'integer',
          isNullable: true,
        }),
      );

      await queryRunner.createUniqueConstraint(
        'user',
        new TableUnique({
          name: 'UQ_9632c6f029358ee3f8cfc3607f3',
          columnNames: ['referredEventId'],
        }),
      );

      await queryRunner.createForeignKey(
        'user',
        new TableForeignKey({
          columnNames: ['referredEventId'],
          referencedTableName: 'referred_event',
          referencedColumnNames: ['id'],
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('user', 'FK_user_referred_event');
    await queryRunner.dropForeignKey(
      'referred_event',
      'FK_referred_event_user',
    );
    await queryRunner.dropUniqueConstraint(
      'user',
      'UQ_9632c6f029358ee3f8cfc3607f3',
    );
    await queryRunner.dropColumn('user', 'referredEventId');
    await queryRunner.dropColumn('user', 'isReferrer');
    await queryRunner.dropColumn('user', 'wasReferred');
    await queryRunner.dropColumn('user', 'chainvineId');
    await queryRunner.dropTable('referred_event');
  }
}
