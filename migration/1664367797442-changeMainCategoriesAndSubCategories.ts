import { MigrationInterface, QueryRunner } from 'typeorm';

const updateSubCategory = async (
  queryRunner: QueryRunner,
  params: {
    mainCategorySlug: string;
    newName: string;
    oldName: string;
    newValue: string;
  },
) => {
  const mainCategory = (
    await queryRunner.query(`SELECT * FROM main_category
        WHERE slug='${params.mainCategorySlug}'`)
  )[0];

  await queryRunner.query(`
           UPDATE category SET name='${params.newName}', value='${params.newValue}', "mainCategoryId"=${mainCategory.id} WHERE name='${params.oldName}'
        `);
};

export class changeMainCategoriesAndSubCategories1664367797442
  implements MigrationInterface
{
  // based on https://docs.google.com/spreadsheets/d/1DAB5UHCYO4hkw_RLRtz8DLXpGduVDRMHfiW-71H0m8o/edit#gid=122470553
  // and https://github.com/Giveth/GIVeconomy/issues/723
  async up(queryRunner: QueryRunner): Promise<void> {
    const lastMainCategory = (
      await queryRunner.query(
        `
                SELECT id
                FROM main_category
                ORDER BY id DESC
                LIMIT 1
            `,
      )
    )[0];
    let lastId = lastMainCategory.id;
    await queryRunner.query(`
           INSERT INTO public.main_category(id, title, slug, description, banner) VALUES
             (${++lastId}, 'Nature','nature', '', ''),
             (${++lastId}, 'Community','community', '', ''),
             (${++lastId}, 'Finance','finance', '', ''),
             (${++lastId}, 'Education','education', '', ''),
             (${++lastId}, 'Equality','equality', '', ''),
             (${++lastId}, 'Other','other', '', '');
        `);

    await queryRunner.query(`
           UPDATE main_category SET title='Economics & Infrastructure' where slug='economic-and-infrastructure'
        `);

    await queryRunner.query(`
           UPDATE main_category SET title='NGO', slug='ngo' where slug='non-profit'
        `);

    await queryRunner.query(`
           UPDATE main_category SET title='Technology', slug='technology' where slug='technology-and-education'
        `);

    const subCategoryArray = [
      {
        oldName: 'agriculture',
        mainCategorySlug: 'nature',
        newValue: 'Agriculture',
        newName: 'agriculture',
      },
      {
        oldName: 'air',
        mainCategorySlug: 'nature',
        newValue: 'Air',
        newName: 'air',
      },
      {
        oldName: 'biodiversity',
        mainCategorySlug: 'nature',
        newValue: 'Conservation & Biodiversity',
        newName: 'conservation-and-biodiversity',
      },
      {
        oldName: 'land',
        mainCategorySlug: 'environment-and-energy',
        newValue: 'Sustainable Cities & Communities',
        newName: 'sustainable-cities-and-communities',
      },
      {
        oldName: 'oceans',
        mainCategorySlug: 'environment-and-energy',
        newValue: 'Ocean',
        newName: 'ocean',
      },
      {
        oldName: 'pollution',
        mainCategorySlug: 'environment-and-energy',
        newValue: 'Climate Action',
        newName: 'climate-action',
      },
      {
        oldName: 'water',
        mainCategorySlug: 'community',
        newValue: 'Water & Sanitation',
        newName: 'water-and-sanitation',
      },
      {
        oldName: 'housing',
        mainCategorySlug: 'community',
        newValue: 'Housing',
        newName: 'housing',
      },
      {
        oldName: 'employment',
        mainCategorySlug: 'economic-and-infrastructure',
        newValue: 'Employment',
        newName: 'employment',
      },
      {
        oldName: 'finance',
        mainCategorySlug: 'finance',
        newValue: 'Refi',
        newName: 'refi',
      },
      {
        oldName: 'food',
        mainCategorySlug: 'community',
        newValue: 'Food',
        newName: 'food',
      },
      {
        oldName: 'health',
        mainCategorySlug: 'health-and-wellness',
        newValue: 'Health Care',
        newName: 'health-care',
      },
      {
        oldName: 'technology',
        mainCategorySlug: 'technology',
        newValue: 'Tech',
        newName: 'tech',
      },
      {
        oldName: 'community',
        mainCategorySlug: 'community',
        newValue: 'Grassroots',
        newName: 'grassroots',
      },

      {
        oldName: 'art-culture',
        mainCategorySlug: 'art-and-culture',
        newValue: 'Art',
        newName: 'art',
      },
      {
        oldName: 'inclusion',
        mainCategorySlug: 'equality',
        newValue: 'Inclusion',
        newName: 'inclusion',
      },
      {
        oldName: 'non-profit',
        mainCategorySlug: 'ngo',
        newValue: 'Registered Non-profits',
        newName: 'registered-non-profits',
      },
      {
        oldName: 'other',
        mainCategorySlug: 'other',
        newValue: 'Other',
        newName: 'other',
      },
    ];
    await Promise.all(
      subCategoryArray.map(item => updateSubCategory(queryRunner, item)),
    );

    const projectCategoryRelationTableExists = await queryRunner.hasTable(
      'project_categories_category',
    );
    if (projectCategoryRelationTableExists) {
      const changeCategory = (
        await queryRunner.query(`SELECT * FROM category
        WHERE name='change'`)
      )[0];
      const givingBlockCategory = (
        await queryRunner.query(`SELECT * FROM category
        WHERE name='the-giving-block'`)
      )[0];
      const registeredNonProfitsCategory = (
        await queryRunner.query(`SELECT * FROM category
        WHERE name='registered-non-profits'`)
      )[0];
      if (changeCategory) {
        await queryRunner.query(`
           UPDATE project_categories_category
           SET "categoryId"=${registeredNonProfitsCategory.id}
           WHERE "categoryId"=${changeCategory.id}
        `);
      }
      if (givingBlockCategory) {
        await queryRunner.query(`
           UPDATE project_categories_category
           SET "categoryId"=${registeredNonProfitsCategory.id}
           WHERE "categoryId"=${givingBlockCategory.id}
        `);
      }

      const wasteCategory = (
        await queryRunner.query(`SELECT * FROM category
        WHERE name='waste'`)
      )[0];
      const wasteProjectCategories =
        await queryRunner.query(`SELECT * FROM project_categories_category
          WHERE "categoryId"=${wasteCategory.id} `);
      const waterAndSanitationCategory = (
        await queryRunner.query(`SELECT * FROM category
        WHERE name='water-and-sanitation'`)
      )[0];
      for (const wastProjectCategory of wasteProjectCategories) {
        const projectCategoryRelationExists =
          await queryRunner.query(`SELECT * FROM project_categories_category
          WHERE "categoryId"=${waterAndSanitationCategory.id} AND "projectId"=${wastProjectCategory.projectId}`);
        if (!projectCategoryRelationExists) {
          await queryRunner.query(`
           UPDATE project_categories_category
           SET "categoryId"=${waterAndSanitationCategory.id}
           WHERE id=${wastProjectCategory.id}
        `);
        }
      }

      await queryRunner.query(
        `
                UPDATE category SET "isActive" = false
                WHERE name NOT IN ('agriculture','air','conservation-and-biodiversity','sustainable-cities-and-communities','ocean','climate-action','water-and-sanitation','housing','employment','refi','food','health-care','tech','grassroots','art','inclusion','registered-non-profits','other','nutrition','energy', 'real-estate', 'infrastructure','research')
              `,
      );
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
