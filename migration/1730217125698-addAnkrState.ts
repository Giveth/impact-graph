import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnkrState1730217125698 implements MigrationInterface {
  name = 'AddAnkrState1730217125698';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ankr_state" ("id" boolean NOT NULL, "timestamp" integer NOT NULL, CONSTRAINT "CHK_69b5646f9179ec91582413e97b" CHECK ("id"), CONSTRAINT "PK_3599fb1e1f37fa9a8da5b4113b7" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ankr_state"`);
  }
}
