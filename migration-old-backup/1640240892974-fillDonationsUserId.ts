import { MigrationInterface, QueryRunner } from 'typeorm';
import { User } from '../src/entities/user';
import { Donation } from '../src/entities/donation';

export class fillDonationsUserId1640240892974 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const donations = await queryRunner.query(
      `
                    SELECT donation.id AS "donationId", "fromWalletAddress", u.id AS "userId"  FROM donation 
                    INNER JOIN public."user" AS u ON "walletAddress" = "fromWalletAddress"
                    WHERE anonymous=true AND "userId" IS null 
                    ORDER BY donation.id ASC
                    `,
    );
    for (const donation of donations) {
      await queryRunner.query(
        `
              UPDATE donation
              SET anonymous= false, "userId"=${donation.userId}
              WHERE id=${donation.donationId}
      `,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
