import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddMinimumModelScoreToQfRounds1718079388796
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE "qf_round" 
          ADD COLUMN IF NOT EXISTS "minimumUserAnalysisScore" FLOAT NULL;
        `);

    // Add new entity to handle userAnalysis per round
    await queryRunner.createTable(
      new Table({
        name: 'user_qf_round_model_score',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'qfRoundId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'score',
            type: 'real',
            isNullable: false,
            default: 0,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'user_qf_round_model_score',
      new TableIndex({
        name: 'IDX_USER_ID',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'user_qf_round_model_score',
      new TableIndex({
        name: 'IDX_QF_ROUND_ID',
        columnNames: ['qfRoundId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE "qf_round" 
          DROP COLUMN IF EXISTS "minimumUserAnalysisScore"
        `);

    await queryRunner.dropIndex('user_qf_round_model_score', 'IDX_QF_ROUND_ID');
    await queryRunner.dropIndex('user_qf_round_model_score', 'IDX_USER_ID');
    await queryRunner.dropTable('user_qf_round_model_score');
  }
}
