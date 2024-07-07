import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEligibleNetworksToQfRoundEntity1694295208252
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE public.qf_round
            ADD COLUMN IF NOT EXISTS "eligibleNetworks" integer array DEFAULT ARRAY[]::integer[]
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('qf_round', 'eligibleNetworks');
  }
}
