import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEarlyAccessRoundTable1724799772891
  implements MigrationInterface
{
  name = 'AddEarlyAccessRoundTable1724799772891';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" RENAME COLUMN "earlyAccessRound" TO "earlyAccessRoundId"`,
    );
    await queryRunner.query(
      `CREATE TABLE "early_access_round" ("id" SERIAL NOT NULL, "roundNumber" integer NOT NULL, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e2f9598b0bbed3f05ca5c49fedc" UNIQUE ("roundNumber"), CONSTRAINT "PK_b128520615d2666c576399b07d3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "earlyAccessRoundId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "earlyAccessRoundId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_635e96839361920b7f80da1dd51" FOREIGN KEY ("earlyAccessRoundId") REFERENCES "early_access_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_635e96839361920b7f80da1dd51"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "earlyAccessRoundId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "earlyAccessRoundId" boolean DEFAULT false`,
    );
    await queryRunner.query(`DROP TABLE "early_access_round"`);
    await queryRunner.query(
      `ALTER TABLE "donation" RENAME COLUMN "earlyAccessRoundId" TO "earlyAccessRound"`,
    );
  }
}
