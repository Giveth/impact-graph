import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectDonationSummary1727039929732
  implements MigrationInterface
{
  name = 'AddProjectDonationSummary1727039929732';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project_donation_summary" ("id" SERIAL NOT NULL, "totalDonationAmount" real NOT NULL DEFAULT '0', "totalDonationUsdAmount" real NOT NULL DEFAULT '0', "projectId" integer NOT NULL, "qfRoundId" integer, "earlyAccessRoundId" integer, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_9bfc47d826b319210cbd85cb1b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_85ab01335360c36cc54fe5a5c2" ON "project_donation_summary" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eaf5c798d37905ea950b6d9b46" ON "project_donation_summary" ("qfRoundId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9ea33aaa0e4d455829a1db1c0b" ON "project_donation_summary" ("earlyAccessRoundId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "reviewStatus" SET DEFAULT 'Listed'`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_donation_summary" ADD CONSTRAINT "FK_85ab01335360c36cc54fe5a5c2f" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_donation_summary" ADD CONSTRAINT "FK_eaf5c798d37905ea950b6d9b468" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_donation_summary" ADD CONSTRAINT "FK_9ea33aaa0e4d455829a1db1c0bc" FOREIGN KEY ("earlyAccessRoundId") REFERENCES "early_access_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_donation_summary" DROP CONSTRAINT "FK_9ea33aaa0e4d455829a1db1c0bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_donation_summary" DROP CONSTRAINT "FK_eaf5c798d37905ea950b6d9b468"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_donation_summary" DROP CONSTRAINT "FK_85ab01335360c36cc54fe5a5c2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "reviewStatus" SET DEFAULT 'Not Reviewed'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9ea33aaa0e4d455829a1db1c0b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eaf5c798d37905ea950b6d9b46"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_85ab01335360c36cc54fe5a5c2"`,
    );
    await queryRunner.query(`DROP TABLE "project_donation_summary"`);
  }
}
