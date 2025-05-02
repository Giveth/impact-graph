import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVestingTableMigration1746211907434
  implements MigrationInterface
{
  name = 'Migration1746211907434';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "vesting_data" ("id" SERIAL NOT NULL, "status" text NOT NULL DEFAULT 'pending', "walletAddress" character varying, "paymentToken" character varying NOT NULL, "amount" bigint NOT NULL, "rewardStreamStart" TIMESTAMP, "cliff" double precision, "rewardStreamEnd" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "projectId" integer, "userId" integer, CONSTRAINT "UQ_c3a2fee0a7bc2c327ee29daac85" UNIQUE ("walletAddress"), CONSTRAINT "PK_c8abbf61fa05ae0eec4048b6408" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2826daca8f0317c5e209df4de5" ON "vesting_data" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b81d2052f429a1bce90dc68e2e" ON "vesting_data" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "vesting_data" ADD CONSTRAINT "FK_2826daca8f0317c5e209df4de55" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vesting_data" ADD CONSTRAINT "FK_b81d2052f429a1bce90dc68e2ee" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vesting_data" DROP CONSTRAINT "FK_b81d2052f429a1bce90dc68e2ee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vesting_data" DROP CONSTRAINT "FK_2826daca8f0317c5e209df4de55"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b81d2052f429a1bce90dc68e2e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2826daca8f0317c5e209df4de5"`,
    );
    await queryRunner.query(`DROP TABLE "vesting_data"`);
  }
}
