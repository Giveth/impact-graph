import { MigrationInterface, QueryRunner } from 'typeorm';
import { endaomentProjects } from './data/importedEndaomentProjects';
import { endaomentProjectCategoryMapping } from './data/endaomentProjectCategoryMapping';
import { NETWORK_IDS } from '../src/provider';

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
    console.log(`Processing ${endaomentProjects.length} projects`);

    for (const project of endaomentProjects) {
      const mainnetAddress = project.mainnetAddress;
      const projectAddresses = await queryRunner.query(
        `SELECT * FROM project_address WHERE LOWER(address) = $1 AND "networkId" = $2 LIMIT 1`,
        [mainnetAddress!.toLowerCase(), NETWORK_IDS.MAIN_NET],
      );

      const projectAddress = await projectAddresses?.[0];

      if (!projectAddress) {
        // eslint-disable-next-line no-console
        console.log(`Could not find project address for ${mainnetAddress}`);
        continue;
      }

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
      if (!project.nteeCode) {
        // eslint-disable-next-line no-console
        console.log(`Could not find nteeCode for ${mainnetAddress}`);
        continue;
      }
      const categoryNames = getCategoryNames(String(project.nteeCode));
      const bannerImage = `/images/defaultProjectImages/${imageCategoryMapping[categoryNames[1]] || '1'}.png`;
      await queryRunner.query(`UPDATE project SET image = $1 WHERE id = $2`, [
        bannerImage,
        projectAddress.projectId,
      ]);
      // eslint-disable-next-line no-console
      console.log(
        `Updated project ${projectAddress.projectId} with image ${bannerImage}`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No down migration
  }
}
