import { MigrationInterface, QueryRunner } from 'typeorm';

export class createPowerRoundTable1662877385311 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const powerRoundTableExists = await queryRunner.hasTable('power_round');

    if (powerRoundTableExists) {
      // eslint-disable-next-line no-console
      console.log('createPowerRoundTable power_round table exists');
      return;
    }
    await queryRunner.query(
      `

                CREATE TABLE IF NOT EXISTS public.power_round
                (
                    id boolean NOT NULL,
                    round integer NOT NULL,
                    CONSTRAINT "PK_20f1201b836ac3669274c9bbb08" PRIMARY KEY (id),
                    CONSTRAINT "CHK_c667c3ba68987e3761531fe585" CHECK (id)
                )
          `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS power_round CASCADE`);
  }
}
