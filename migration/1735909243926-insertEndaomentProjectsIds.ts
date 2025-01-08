/**
 * This migration script is used to insert the endaomentId values for the projects in the endaomentProjects array.
 * The endaomentId values are used to link the projects in the database with the projects in the Endaoment platform.
 *
 * The script will add a new column to the project table called "endaomentId".
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import { endaomentProjects } from './data/updatedEndaomentProjects';

export class InsertEndaomentProjectsIds1735909243926
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add endaomentId column to the project table
    queryRunner.query(`
        ALTER TABLE "project"
        ADD COLUMN IF NOT EXISTS "endaomentId" UUID;
    `);

    // Get the organization ID for Endaoment
    const endaomentOrgIdResult = await queryRunner.query(`
        SELECT "id" FROM "organization" WHERE "label" = 'endaoment';
      `);
    const endaomentOrgId = endaomentOrgIdResult[0].id;

    // Go through each project in the endaomentProjects array and update the endaomentId value in the database
    for (const project of endaomentProjects) {
      const singleProject = await queryRunner.query(
        `SELECT "id" FROM "project" WHERE "title" = $1 AND "organizationId" = $2`,
        [project.name, endaomentOrgId],
      );

      // Update project endaomentId value
      if (
        singleProject &&
        singleProject.length > 0 &&
        singleProject[0].id > 0
      ) {
        await queryRunner.query(`
          UPDATE "project"
          SET "endaomentId" = '${project.endaomentID}'
          WHERE "id" = '${singleProject[0].id}';
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
        ALTER TABLE "project"
        DROP COLUMN IF EXISTS "endaomentId";
    `);
  }
}
