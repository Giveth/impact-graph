import { MigrationInterface, QueryRunner } from 'typeorm';
import { updateRecurringDonationFromTheStreamDonations } from '../src/repositories/recurringDonationRepository.js';

export class ModifyAmountOfUsdcRecurringDonations1720939399738
  implements MigrationInterface
{
  // https://github.com/Giveth/giveth-dapps-v2/issues/4196
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Find and update the donations
    const result = await queryRunner.query(`
                UPDATE donation
                SET amount = "valueUsd"
                WHERE "recurringDonationId" IS NOT NULL AND currency = 'USDC'
                RETURNING "recurringDonationId"
            `);

    // Extract unique recurringDonationIds
    const recurringDonationIds = result?.[0]
      .map(row => row.recurringDonationId)
      .filter((value, index, self) => self.indexOf(value) === index);

    // Call the function for each unique recurringDonationId
    for (const recurringDonationId of recurringDonationIds) {
      try {
        await updateRecurringDonationFromTheStreamDonations(
          recurringDonationId,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          `Error updating recurring donation with ID ${recurringDonationId}:`,
          error,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the donations
    const result = await queryRunner.query(`
                UPDATE donation
                SET amount = amount * 10 / 12
                WHERE "recurringDonationId" IS NOT NULL AND currency = 'USDC'
                RETURNING "recurringDonationId"
            `);

    // Extract unique recurringDonationIds
    const recurringDonationIds = result
      .map(row => row.recurringDonationId)
      .filter((value, index, self) => self.indexOf(value) === index);

    // Call the function for each unique recurringDonationId
    for (const recurringDonationId of recurringDonationIds) {
      try {
        await updateRecurringDonationFromTheStreamDonations(
          recurringDonationId,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          `Error reverting recurring donation with ID ${recurringDonationId}:`,
          error,
        );
      }
    }
  }
}
