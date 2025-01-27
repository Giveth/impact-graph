import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class addUniquenessToEstimatedClusterMatching1737553475189
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createUniqueConstraint(
      'estimated_cluster_matching',
      new TableUnique({
        name: 'unique_projectId_qfRoundId',
        columnNames: ['projectId', 'qfRoundId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint(
      'estimated_cluster_matching',
      'unique_projectId_qfRoundId',
    );
  }
}
