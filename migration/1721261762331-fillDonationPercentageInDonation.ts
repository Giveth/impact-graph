import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../src/config.js';

interface DonationUpdate {
  id: number;
  donationPercentage: number;
}

export class FillDonationPercentageInDonation1721261762331
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;

    if (environment === 'test') {
      return;
    }

    // Load all donations with useDonationBox set to true
    const donations = await queryRunner.query(
      `SELECT id, "userId", "projectId", "createdAt", "transactionId", amount, "relevantDonationTxHash"
       FROM donation WHERE "useDonationBox" = true`,
    );

    // Calculate the donation percentages
    const updates: DonationUpdate[] = [];

    for (const donation of donations) {
      if (donation.projectId === 1 && donation.relevantDonationTxHash) {
        const relevantDonation = donations.find(
          d => d.transactionId === donation.relevantDonationTxHash,
        );

        if (relevantDonation) {
          const totalAmount = donation.amount + relevantDonation.amount;
          const donationPercentage = (donation.amount / totalAmount) * 100;

          updates.push({
            id: donation.id,
            donationPercentage,
          });
        }
      }
    }

    // Perform batch update using a single query
    if (updates.length > 0) {
      const updateQuery = updates
        .map(update => `(${update.id}, ${update.donationPercentage})`)
        .join(', ');

      await queryRunner.query(
        `
                UPDATE donation AS d
                SET "donationPercentage" = u."donationPercentage" FROM (VALUES ${updateQuery}) AS u(id
                  , "donationPercentage")
                WHERE d.id = u.id;
            `,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        UPDATE donation
        SET "donationPercentage" = NULL
        WHERE "donationPercentage" IS NOT NULL;
      `,
    );
  }
}
