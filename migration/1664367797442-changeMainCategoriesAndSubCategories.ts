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
           UPDATE category SET name='${params.newName}', value='${params.newValue}', mainCategoryId=${mainCategory.id} WHERE name='${params.oldName}'
        `);
};

export class changeMainCategoriesAndSubCategories1664367797442
  implements MigrationInterface
{
  // based on https://docs.google.com/spreadsheets/d/1DAB5UHCYO4hkw_RLRtz8DLXpGduVDRMHfiW-71H0m8o/edit#gid=122470553
  // and https://github.com/Giveth/GIVeconomy/issues/723
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
           INSERT INTO public.main_category(title, slug, description, banner) VALUES
             ('Nature','nature', '', ''),
             ('Community','community', '', ''),
             ('Finance','finance', '', ''),
             ('Education','education', '', ''),
             ('Equality','equality', '', ''),
             ('Other','other', '', '');
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
        oldName: 'waste',
        mainCategorySlug: 'community',
        newValue: 'Water & Sanitation',
        newName: 'water-and-sanitation',
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
        newValue: 'art',
        newName: 'art',
      },
    ];
    await Promise.all(
      subCategoryArray.map(item => updateSubCategory(queryRunner, item)),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
