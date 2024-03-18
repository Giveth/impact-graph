import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedCategories1640767827635 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const categories = await queryRunner.query(`SELECT * FROM category`);
    if (categories.length > 0) {
      return;
    }

    await queryRunner.query(`INSERT INTO public.category (name, value, source) VALUES
                    ('community','Community','adhoc'),
                    ('food','Food','adhoc'),
                    ('non-profit','Non-profit','adhoc'),
                    ('housing','Housing','adhoc'),
                    ('technology','Technology','adhoc'),
                    ('research','Research','adhoc'),
                    ('nutrition','Nutrition','adhoc'),
                    ('art-culture','Art & Culture','adhoc'),
                    ('agriculture','Agriculture','adhoc'),
                    ('air','Air','adhoc'),
                    ('biodiversity','Biodiversity','adhoc'),
                    ('climate','Climate','adhoc'),
                    ('inclusion','Inclusion','adhoc'),
                    ('education','Education','adhoc'),
                    ('employment','Employment','adhoc'),
                    ('energy','Energy','adhoc'),
                    ('finance','Finance','adhoc'),
                    ('health','Health','adhoc'),
                    ('infrastructure','Infrastructure','adhoc'),
                    ('land','Land','adhoc'),
                    ('oceans','Oceans','adhoc'),
                    ('pollution','Pollution','adhoc'),
                    ('real-estate','Real State','adhoc'),
                    ('waste','Waste','adhoc'),
                    ('water','Water','adhoc'),
                    ('other','Other','adhoc'),
                    ('the-giving-block','The Giving block','adhoc'),
                    ('change','Change','adhoc')
                    ;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM category`);
  }
}
