import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectUserRecord1727612450457 implements MigrationInterface {
  name = 'AddProjectUserRecord1727612450457';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project_user_record" ("id" SERIAL NOT NULL, "totalDonationAmount" double precision NOT NULL DEFAULT '0', "eaTotalDonationAmount" double precision NOT NULL DEFAULT '0', "qfTotalDonationAmount" double precision NOT NULL DEFAULT '0', "projectId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_491352d8cb0de1670d85f622f30" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_29abdbcc3e6e7090cbc8fb1a90" ON "project_user_record" ("projectId", "userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" ADD CONSTRAINT "FK_6481d6181bd857725e903b0f330" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" ADD CONSTRAINT "FK_47c452701e3e8553fb01a904256" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_user_record" DROP CONSTRAINT "FK_47c452701e3e8553fb01a904256"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" DROP CONSTRAINT "FK_6481d6181bd857725e903b0f330"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29abdbcc3e6e7090cbc8fb1a90"`,
    );
    await queryRunner.query(`DROP TABLE "project_user_record"`);
  }
}
