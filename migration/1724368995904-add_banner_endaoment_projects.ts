import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBannerEndaomentProjects1724368995904
  implements MigrationInterface
{
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
      Culture: 'art-culture',
      Recycling: 'nature',
      Agriculture: 'nature',
      Grassroots: 'community',
      'BIPOC Communities': 'equality',
      Fundraising: 'non-profit',
      'Registred Non-profits': 'non-profit',
      'Gender Equality': 'equality',
    };
    const endaomentOrgIdResult = await queryRunner.query(`
            SELECT "id" FROM "organization" WHERE "label" = 'endaoment';
          `);
    const endaomentOrgId = endaomentOrgIdResult[0].id;
    const projects =
      await queryRunner.query(`SELECT "project"."id", array_agg("category"."value") as "categories","project"."image"
            FROM "project"
            LEFT JOIN "project_categories_category" "projectCategory" ON "projectCategory"."projectId" = "project"."id"
            LEFT JOIN "category" "category" ON "category"."id" = "projectCategory"."categoryId"
            WHERE "project"."organizationId" = ${endaomentOrgId}
            GROUP BY "project"."id";`);
    for (const project of projects) {
      for (const category of project.categories) {
        if (category !== 'Endaoment') {
          const bannerImage = `/images/defaultProjectImages/${imageCategoryMapping[category] || '1'}.png`;
          await queryRunner.query(
            `UPDATE "project" SET "image" = '${bannerImage}' WHERE "project"."id" = ${project.id};`,
          );
          if (imageCategoryMapping[category]) break;
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('');
  }
}
