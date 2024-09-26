import { MigrationInterface, QueryRunner } from 'typeorm';
import { ProjectEstimatedMatchingViewV21717646357435 } from './1717646357435-ProjectEstimatedMatchingView_V2';
import { ProjectActualMatchingViewV161717646612482 } from './1717646612482-ProjectActualMatchingView_V16';

export class AddProjectRoundRecord1727306636337 implements MigrationInterface {
  name = 'AddProjectRoundRecord1727306636337';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const projectEstimatedMatchingViewMigration =
      new ProjectEstimatedMatchingViewV21717646357435();
    const projectActualMatchingViewMigration =
      new ProjectActualMatchingViewV161717646612482();

    projectEstimatedMatchingViewMigration.down(queryRunner);
    projectActualMatchingViewMigration.down(queryRunner);

    await queryRunner.query(
      `CREATE TABLE "project_round_record" ("id" SERIAL NOT NULL, "totalDonationAmount" double precision NOT NULL DEFAULT '0', "totalDonationUsdAmount" double precision NOT NULL DEFAULT '0', "cumulativePastRoundsDonationAmounts" double precision, "projectId" integer NOT NULL, "qfRoundId" integer, "earlyAccessRoundId" integer, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_12235e8150f9316b4a1cd12ab6c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9022d80598f5745e16fae6eedb" ON "project_round_record" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10fb7db4f63d8f66500522e68d" ON "project_round_record" ("qfRoundId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e38c97721c97da21937433c8c0" ON "project_round_record" ("earlyAccessRoundId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "amount" TYPE double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "valueEth" TYPE double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "valueUsd" TYPE double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "priceEth" TYPE double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "priceUsd" TYPE double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_round_record" ADD CONSTRAINT "FK_9022d80598f5745e16fae6eedb0" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_round_record" ADD CONSTRAINT "FK_10fb7db4f63d8f66500522e68d4" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_round_record" ADD CONSTRAINT "FK_e38c97721c97da21937433c8c07" FOREIGN KEY ("earlyAccessRoundId") REFERENCES "early_access_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    projectActualMatchingViewMigration.up(queryRunner);
    projectEstimatedMatchingViewMigration.up(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_round_record" DROP CONSTRAINT "FK_e38c97721c97da21937433c8c07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_round_record" DROP CONSTRAINT "FK_10fb7db4f63d8f66500522e68d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_round_record" DROP CONSTRAINT "FK_9022d80598f5745e16fae6eedb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "amount" TYPE real`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "valueEth" TYPE real`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "valueUsd" TYPE real`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "priceEth" TYPE real`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ALTER COLUMN "priceUsd" TYPE real`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e38c97721c97da21937433c8c0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_10fb7db4f63d8f66500522e68d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9022d80598f5745e16fae6eedb"`,
    );
    await queryRunner.query(`DROP TABLE "project_round_record"`);
  }
}
