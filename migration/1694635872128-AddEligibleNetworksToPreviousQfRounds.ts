import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../src/config.js';

export class AddEligibleNetworksToPreviousQfRounds1694635872128
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;

    // Define the eligible network IDs based on the conditions
    const eligibleNetworks =
      environment !== 'production'
        ? [1, 3, 5, 100, 137, 10, 11155420, 56, 42220, 44787] // Include testnets for staging
        : [1, 137, 56, 42220, 100, 10]; // Exclude testnets for non-staging

    // Update the "qf_round" table with the new eligibleNetworks values
    await queryRunner.query(
      `
            UPDATE public.qf_round
            SET "eligibleNetworks" = $1
        `,
      [eligibleNetworks],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE public.qf_round
            SET "eligibleNetworks" = '{}'
        `);
  }
}
