import { MigrationInterface, QueryRunner } from 'typeorm';
import { endaomentProjects } from './data/importedEndaomentProjects';
import { endaomentProjectCategoryMapping } from './data/endaomentProjectCategoryMapping';
import { NETWORK_IDS } from '../src/provider';
export class AddEndaomentProjectBanners1726069430594
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const mainCategorySlugToBannerMapping = {
      'environment-and-energy': 'nature',
      'health-and-wellness': 'health-wellness',
      'art-and-culture': 'art-culture',
      nature: 'nature',
      community: 'community',
      finance: 'finance',
      education: 'education',
      equality: 'equality',
      other: '1',
      'economic-and-infrastructure': 'economic-infrastructure',
      ngo: 'non-profit',
      technology: 'technology',
    };
    const subCategoryToCategory = await queryRunner.query(
      'SELECT category.value, main_category.slug from category LEFT JOIN main_category on category."mainCategoryId" = main_category.id;',
    );

    const imageCategoryMapping = subCategoryToCategory.reduce(function (
      categoryImageKeyPair,
      category: { value: string; slug: string },
    ) {
      const bannerLink = mainCategorySlugToBannerMapping[category.slug] || '1';
      categoryImageKeyPair[category.value] = bannerLink;
      return categoryImageKeyPair;
    }, {});

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No down migration
  }
}
