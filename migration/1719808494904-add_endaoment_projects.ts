import { MigrationInterface, QueryRunner } from "typeorm";
import { endaomentProjects } from './data/importedEndaomentProjects';
import { NETWORK_IDS } from '../src/provider';
import { findUserByWalletAddress } from '../src/repositories/userRepository';
import { generateRandomEtheriumAddress } from '../test/testUtils';
import { ReviewStatus } from '../src/entities/project';
import { User } from '@sentry/node';

export class AddEndaomentProjects1719808494904 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert the Endaoment organization if it doesn't exist
    await queryRunner.query(`
            INSERT INTO "organization" ("name", "disableNotifications", "disableRecurringDonations", "disableUpdateEnforcement", "label", "website", "supportCustomTokens")
            VALUES ('Endaoment', false, false, false, 'endaoment', NULL, false)
            ON CONFLICT DO NOTHING;
        `);

    // Get the organization ID for Endaoment
    const endaomentOrgIdResult = await queryRunner.query(`
            SELECT "id" FROM "organization" WHERE "label" = 'endaoment';
        `);
    const endaomentOrgId = endaomentOrgIdResult[0].id;

    const endaomentAdminWalletAddress = generateRandomEtheriumAddress();
    const adminUser = await findUserByWalletAddress(endaomentAdminWalletAddress)

    // Insert projects and their addresses
    for (const project of endaomentProjects) {
      // Prepare slug and quality score
      const slugBase = project.name.replace(/[*+~.,()'"!:@]/g, '');
      const slug = slugBase.toLowerCase().replace(/ /g, '-');

      // Insert the project
      await queryRunner.query(`
                INSERT INTO "project" (
                    "title", "description", "organizationId", "categories", "walletAddress", "creationDate", "slug","website", "image", "slugHistory", "givingBlocksId", "statusId", "totalDonations", "totalReactions", "totalProjectUpdates", "listed", "reviewStatus", "verified", "giveBacks", "isImported", "adminUserId"
                )
                VALUES (
                    '${project.name.replace(/'/g, "''")}',
                    '${project.description.replace(/'/g, "''")}',
                    ${endaomentOrgId},
                    '{givingBlocksCategory}', -- Assuming a category value
                    '${project.mainnetAddress || ''}',
                    NOW(),
                    '${slug}',
                    '${project.website || ''}',
                    '${project.logoUrl}',
                    '{}', -- Empty slug history
                    '${project.id}', -- Assuming givingBlocksId is project id in JSON
                    5, -- statusId 5 is 'Active'
                    0,
                    0,
                    0,
                    true,
                    ${ReviewStatus.Listed},
                    true,
                    true,
                    true,
                    ${adminUser?.id}
                );
            `);

      // Get the inserted project's ID
      const projectIdResult = await queryRunner.query(`
                SELECT "id" FROM "project" WHERE "title" = '${project.name.replace(/'/g, "''")}' AND "organizationId" = ${endaomentOrgId};
            `);
      const projectId = projectIdResult[0].id;

      // Insert the project addresses if provided
      if (project.mainnetAddress) {
        await queryRunner.query(`
                    INSERT INTO "project_address" ("projectId", "address", "networkId")
                    VALUES (${projectId}, '${project.mainnetAddress}', ${NETWORK_IDS.MAIN_NET});
                `);
      }

      if (project.opAddress) {
        await queryRunner.query(`
                    INSERT INTO "project_address" ("projectId", "address", "networkId")
                    VALUES (${projectId}, '${project.opAddress}', ${NETWORK_IDS.OPTIMISTIC});
                `);
      }

      if (project.baseAddress) {
        await queryRunner.query(`
                    INSERT INTO "project_address" ("projectId", "address", "networkId")
                    VALUES (${projectId}, '${project.baseAddress}', ${NETWORK_IDS.BASE_MAINNET}   `);
      }

      // Insert the project update
      await queryRunner.query(`
                INSERT INTO "project_update" ("userId", "projectId", "content", "title", "createdAt", "isMain")
                VALUES (
                    (SELECT "id" FROM "user" WHERE "email" = '${adminUser?.email}' LIMIT 1),
                    ${projectId},
                    '',
                    '',
                    NOW(),
                    true
                );
            `);
    }

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete the projects and project addresses for the Endaoment organization
    const endaomentOrgIdResult = await queryRunner.query(`
            SELECT "id" FROM "organization" WHERE "label" = 'endaoment';
        `);
    const endaomentOrgId = endaomentOrgIdResult[0].id;

    await queryRunner.query(`
            DELETE FROM "project_address"
            WHERE "projectId" IN (
                SELECT "id" FROM "project"
                WHERE "organizationId" = ${endaomentOrgId}
            );
        `);

    await queryRunner.query(`
            DELETE FROM "project"
            WHERE "organizationId" = ${endaomentOrgId};
        `);
  }
}
