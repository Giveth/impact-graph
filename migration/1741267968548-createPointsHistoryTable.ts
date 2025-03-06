import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePointsHistoryTable1741267968548
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "qacc_points_history" ("id" SERIAL NOT NULL, "pointsEarned" real NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "donationId" integer, CONSTRAINT "UQ_0783dd0cebeb22564e6677fb441" UNIQUE ("donationId"), CONSTRAINT "PK_0b3ac7e10a5f507563d62120b0e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bc51feb404630572f9dca285c2" ON "qacc_points_history" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0783dd0cebeb22564e6677fb44" ON "qacc_points_history" ("donationId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "qacc_points_history" ADD CONSTRAINT "FK_bc51feb404630572f9dca285c26" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qacc_points_history" ADD CONSTRAINT "FK_0783dd0cebeb22564e6677fb441" FOREIGN KEY ("donationId") REFERENCES "donation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qacc_points_history" DROP CONSTRAINT "FK_0783dd0cebeb22564e6677fb441"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qacc_points_history" DROP CONSTRAINT "FK_bc51feb404630572f9dca285c26"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0783dd0cebeb22564e6677fb44"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bc51feb404630572f9dca285c2"`,
    );
    await queryRunner.query(`DROP TABLE "qacc_points_history"`);
  }
}
