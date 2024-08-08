import { MigrationInterface, QueryRunner } from 'typeorm';
const donationDotEthAddress = '0x6e8873085530406995170Da467010565968C7C62'; // Address behind donation.eth ENS address;
const matchingFundDonationsFromAddress =
  (process.env.MATCHING_FUND_DONATIONS_FROM_ADDRESS as string) ||
  donationDotEthAddress;

export class createDonationethUser1701756190381 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO public."user" ("walletAddress", "name", "loginType", "role") 
            VALUES ('${matchingFundDonationsFromAddress}', 'Donation.eth', 'wallet', 'restricted')
            ON CONFLICT ("walletAddress") DO NOTHING
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!matchingFundDonationsFromAddress) {
      throw new Error('Wallet address is not defined in the configuration.');
    }

    await queryRunner.query(
      `DELETE FROM public."user" WHERE "walletAddress" = '${matchingFundDonationsFromAddress}'`,
    );
  }
}
