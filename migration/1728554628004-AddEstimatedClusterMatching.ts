import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstimatedClusterMatching1728554628004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE estimated_cluster_matching (
              id SERIAL PRIMARY KEY,
              "projectId" INT NOT NULL,
              "qfRoundId" INT NOT NULL,
              matching DOUBLE PRECISION NOT NULL
            );
          `);

    // Create indexes on the new table
    await queryRunner.query(`
            CREATE INDEX estimated_cluster_matching_project_id_qfround_id
            ON estimated_cluster_matching ("projectId", "qfRoundId");
          `);

    await queryRunner.query(`
            CREATE INDEX estimated_cluster_matching_matching
            ON estimated_cluster_matching (matching);
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes if necessary by dropping the table and restoring the view
    await queryRunner.query(`
        DROP TABLE IF EXISTS estimated_cluster_matching;
      `);
  }
}
