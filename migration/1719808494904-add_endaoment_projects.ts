import { MigrationInterface, QueryRunner } from 'typeorm';
import { endaomentProjectCategoryMapping } from './data/endaomentProjectCategoryMapping';
import { endaomentProjects } from './data/importedEndaomentProjects';
import { NETWORK_IDS } from '../src/provider';
import { ReviewStatus } from '../src/entities/project';
import {
  creteSlugFromProject,
  titleWithoutSpecialCharacters,
} from '../src/utils/utils';

export class AddEndaomentsProjects1719808494904 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const imageCategoryMapping = {
      'Public Goods': 'community',
      'Peace & Justice': 'community',
      'Sustainable Cities & Communities': 'nature',
      Housing: 'community',
      'Social Services': 'community',
      'Family & Children': 'community',
      'Health Care': 'community',
      'Registered Non-profits': 'non-profit',
      Research: 'education',
      'Mental Health': 'health-wellness',
      Animals: 'nature',
      Nutrition: 'health-wellness',
      Religious: 'community',
      Art: 'art-culture',
      Food: 'community',
      'Disaster Relief': 'non-profit',
      'Conservation & Biodiversity': 'nature',
      Education: 'education',
      'Industry & Innovation': 'economics-infrastructure',
      'Financial Services': 'finance',
      Schooling: 'education',
      Inclusion: 'equality',
      Climate: 'nature',
      'Water & Sanitation': 'community',
      Tech: 'technology',
      Employment: 'finance',
      Infrastructure: 'economics-infrastructure',
      'International Aid': 'non-profit',
      Other: '1',
      Recreation: 'community',
      culture: 'art-culture',
      Recycling: 'nature',
      Agriculture: 'nature',
      Grassroots: 'community',
      'BIPOC Communities': 'equality',
      Fundraising: 'non-profit',
      'Registred Non-profits': 'non-profit',
      'Gender Equality': 'equality',
    };
    // Insert the Endaoment organization if it doesn't exist
    await queryRunner.query(`
      INSERT INTO "organization" ("name", "disableNotifications", "disableRecurringDonations", "disableUpdateEnforcement", "label", "website", "supportCustomTokens")
      VALUES ('Endaoment', false, false, false, 'endaoment', NULL, false)
    `);

    // Get the organization ID for Endaoment
    const endaomentOrgIdResult = await queryRunner.query(`
      SELECT "id" FROM "organization" WHERE "label" = 'endaoment';
    `);
    const endaomentOrgId = endaomentOrgIdResult[0].id;

    const endaomentAdminWalletAddress = process.env
      .ENDAOMENT_ADMIN_WALLET_ADDRESS as string;
    if (!endaomentAdminWalletAddress) {
      throw new Error('ENDAOMENT_ADMIN_WALLET_ADDRESS env var is required');
    }

    let adminUser = (
      await queryRunner.query(`SELECT * FROM public.user
        WHERE lower("walletAddress")=lower('${endaomentAdminWalletAddress}')`)
    )[0];
    if (!adminUser) {
      // eslint-disable-next-line no-console
      console.log('User is not in our DB, creating .... ');
      await queryRunner.query(`
                    INSERT INTO public.user ("walletAddress", role,"loginType", name)
                    VALUES('${endaomentAdminWalletAddress.toLowerCase()}', 'restricted','wallet', 'Endaoment Admin');
                    `);
      adminUser = (
        await queryRunner.query(`SELECT * FROM public.user
                        WHERE lower("walletAddress")=lower('${endaomentAdminWalletAddress}')`)
      )[0];
    }

    // Insert projects and their addresses
    for (const project of endaomentProjects) {
      // Prepare slug and quality score
      const title = titleWithoutSpecialCharacters(project.name);
      const slugBase = creteSlugFromProject(title);
      // const slug = await getAppropriateSlug(slugBase)
      const slug = slugBase;

      // Insert the project-category relationship in a single query
      const getCategoryNames = (nteeCode: string): string[] => {
        const mapping = endaomentProjectCategoryMapping.find(
          category => category.nteeCode === nteeCode,
        );
        return mapping
          ? [
              mapping.category1,
              mapping.category2,
              mapping.category3 || '',
              mapping.category4 || '',
            ].filter(Boolean)
          : [];
      };
      const categoryNames = getCategoryNames(String(project.nteeCode));

      const bannerImage = `/images/defaultProjectImages/${imageCategoryMapping[categoryNames[1]] || '1'}.png`;

      // Insert the project
      await queryRunner.query(`
          INSERT INTO "project" (
            "title", "description", "descriptionSummary", "organizationId", "walletAddress", "creationDate", "slug", "image", "slugHistory", "statusId", "totalDonations", "totalReactions", "totalProjectUpdates", "listed", "reviewStatus", "verified", "giveBacks", "isImported", "adminUserId"
          )
          VALUES (
            '${title}',
            '${project.description.replace(/'/g, '')}',
            '${project.description.replace(/'/g, '')}',
            ${endaomentOrgId},
            '${project.mainnetAddress || ''}',
            NOW(),
            '${slug}',
            '${bannerImage}',
            '{}', -- Empty slug history
            5, -- statusId 5 is 'Active'
            0,
            0,
            0,
            true,
            '${ReviewStatus.Listed}',
            true,
            true,
            true,
            ${adminUser?.id}
          )

        `);
      //           ON CONFLICT ("slug") DO NOTHING; -- Handle conflict on unique constraint

      // Get the inserted project's ID
      const projectIdResult = await queryRunner.query(`
        SELECT "id" FROM "project" WHERE "slug" = '${slug}' AND "organizationId" = ${endaomentOrgId};
      `);
      const projectId = projectIdResult[0]?.id;
      if (!projectId) {
        // It means we have project with same slug so the creation has failed
        continue;
      }

      for (const categoryName of categoryNames) {
        const categoryIdResult = await queryRunner.query(`
          SELECT "id" FROM "category" WHERE "value" = '${categoryName.replace(/'/g, "''")}' LIMIT 1;
        `);
        const categoryId = categoryIdResult[0]?.id;

        // Insert the project-category relationship if category exists
        if (categoryId) {
          await queryRunner.query(`
            INSERT INTO "project_categories_category" ("projectId", "categoryId")
            VALUES (${projectId}, ${categoryId})
            ON CONFLICT DO NOTHING;
          `);
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            `Category '${categoryName}' not found for project '${project.name}'.`,
          );
        }
      }

      // Insert the project addresses if provided
      if (project.mainnetAddress) {
        await queryRunner.query(`
          INSERT INTO "project_address" ("projectId", "address", "networkId", "isRecipient")
          VALUES (${projectId}, '${project.mainnetAddress}', ${NETWORK_IDS.MAIN_NET}, true);
        `);
      }

      if (project.opAddress) {
        await queryRunner.query(`
          INSERT INTO "project_address" ("projectId", "address", "networkId", "isRecipient")
          VALUES (${projectId}, '${project.opAddress}', ${NETWORK_IDS.OPTIMISTIC}, true);
        `);
      }

      if (project.baseAddress) {
        await queryRunner.query(`
          INSERT INTO "project_address" ("projectId", "address", "networkId", "isRecipient")
          VALUES (${projectId}, '${project.baseAddress}', ${NETWORK_IDS.BASE_MAINNET}, true);
        `);
      }

      // Insert the project update
      await queryRunner.query(`
        INSERT INTO "project_update" ("userId", "projectId", "content", "title", "createdAt", "isMain")
        VALUES (
          ${adminUser?.id},
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
