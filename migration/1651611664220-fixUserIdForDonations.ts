import { MigrationInterface, QueryRunner } from 'typeorm';

// tslint:disable-next-line:class-name
export class fixUserIdForDonations1651611664220 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const donationTableExists = await queryRunner.hasTable('donation');

    if (donationTableExists) {
      // only for anonymous donations
      await queryRunner.query(`
            UPDATE "donation"
            SET "userId" = u.id
            FROM (
                SELECT id, lower("walletAddress") as "userAddress"
                FROM "user"
            ) AS u
            WHERE u."userAddress" = lower("fromWalletAddress")
            AND "anonymous" = true
        `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
