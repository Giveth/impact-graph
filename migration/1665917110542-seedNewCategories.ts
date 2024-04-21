import { MigrationInterface, QueryRunner } from 'typeorm';

const addSubCategory = async (
  queryRunner: QueryRunner,
  params: {
    mainCategorySlug: string;
    subCategoryName: string;
    subCategoryValue: string;
  },
) => {
  const educationMainCategory = (
    await queryRunner.query(`SELECT * FROM main_category
        WHERE slug='${params.mainCategorySlug}'`)
  )[0];

  await queryRunner.query(`INSERT INTO public.category (name, value, source, "isActive", "mainCategoryId") VALUES
                    ('${params.subCategoryName}','${params.subCategoryValue}','adhoc', true, ${educationMainCategory.id} )
                    ;`);
};

export class seedNewCategories1665917110542 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await Promise.all([
      addSubCategory(queryRunner, {
        mainCategorySlug: 'art-and-culture',
        subCategoryName: 'culture',
        subCategoryValue: 'Culture',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'community',
        subCategoryName: 'social-services',
        subCategoryValue: 'Social Services',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'community',
        subCategoryName: 'family-and-children',
        subCategoryValue: 'Family & Children',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'community',
        subCategoryName: 'partnerships',
        subCategoryValue: 'Partnerships',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'community',
        subCategoryName: 'peace-and-justice',
        subCategoryValue: 'Peace & Justice',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'community',
        subCategoryName: 'public-goods',
        subCategoryValue: 'Public Goods',
      }),

      addSubCategory(queryRunner, {
        mainCategorySlug: 'economic-and-infrastructure',
        subCategoryName: 'poverty',
        subCategoryValue: 'Poverty',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'economic-and-infrastructure',
        subCategoryName: 'ubi',
        subCategoryValue: 'UBI',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'economic-and-infrastructure',
        subCategoryName: 'industry-and-innovation',
        subCategoryValue: 'Industry & Innovation',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'education',
        subCategoryName: 'education-tech',
        subCategoryValue: 'Tech',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'education',
        subCategoryName: 'schooling',
        subCategoryValue: 'Schooling',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'equality',
        subCategoryName: 'gender-equality',
        subCategoryValue: 'Gender equality',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'equality',
        subCategoryName: 'bipoc-communities',
        subCategoryValue: 'BIPOC Communities',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'finance',
        subCategoryName: 'fundraising',
        subCategoryValue: 'Fundraising',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'health-and-wellness',
        subCategoryName: 'mental-health',
        subCategoryValue: 'Mental Health',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'health-and-wellness',
        subCategoryName: 'children-health',
        subCategoryValue: 'Children Health',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'nature',
        subCategoryName: 'animals',
        subCategoryValue: 'Animals',
      }),
      addSubCategory(queryRunner, {
        mainCategorySlug: 'technology',
        subCategoryName: 'desci',
        subCategoryValue: 'DeSci',
      }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                DELETE from category
                WHERE name IN ('culture','social-services','family-and-children','partnerships','peace-and-justice', 'public-goods','poverty','ubi','education-tech','schooling','gender-equality','bipoc-communities','fundraising','mental-health','children-health','animals','desci','industry-and-innovation')
              `,
    );
  }
}
