import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCategoryAndAddPriority1662269791929
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE IF EXISTS "category" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0
    `);
    await queryRunner.query(`
            UPDATE category
                    SET priority =2
                    WHERE id = 1;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 2;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =1
                    WHERE id = 3;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 4;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =3
                    WHERE id = 5;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =1
                    WHERE id = 6;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 7;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =1
                    WHERE id = 8;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 9;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 10;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 11;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =1
                    WHERE id = 12;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =1
                    WHERE id = 13;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 14;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 15;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =1
                    WHERE id = 16;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 17;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 18;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 19;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 20;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 21;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =1
                    WHERE id = 22;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =3
                    WHERE id = 23;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =3
                    WHERE id = 24;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 25;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 26;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 27;
        `);

    await queryRunner.query(`
             UPDATE category
                    SET priority =2
                    WHERE id = 28;
        `);
    await queryRunner.query(`
             UPDATE category
                    SET priority =1
                    WHERE id = 29;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
