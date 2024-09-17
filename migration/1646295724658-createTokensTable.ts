import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTokensTable1646295724658 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
       CREATE TABLE IF NOT EXISTS token
         (
          id SERIAL NOT NULL,
          name text COLLATE pg_catalog."default" NOT NULL,
          symbol text COLLATE pg_catalog."default" NOT NULL,
          address text COLLATE pg_catalog."default" NOT NULL,
          "isQR" BOOLEAN DEFAULT FALSE NOT NUL,
          "networkId" integer NOT NULL,
          decimals integer NOT NULL,
          "order" integer,
          "mainnetAddress" text,
          CONSTRAINT "PK_82fae97f905930df5d62a702fc9" PRIMARY KEY (id)
           )`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('token')) {
      await queryRunner.query(`DROP TABLE "token"`);
    }
  }
}
