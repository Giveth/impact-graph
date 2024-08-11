import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectAddressTable1716000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      CREATE TABLE IF NOT EXISTS project_address
      (
          id SERIAL NOT NULL,
          title character varying COLLATE pg_catalog."default",
          "networkId" integer NOT NULL,
          address character varying COLLATE pg_catalog."default" NOT NULL,
          "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
          "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
          "projectId" integer,
          "userId" integer,
          "isRecipient" boolean NOT NULL DEFAULT false,
          CONSTRAINT "PK_4b009b646c93a19e1932133d50c" PRIMARY KEY (id),
          CONSTRAINT "UQ_2c7d7bad132585525b77a5b4867" UNIQUE (address, "networkId", "projectId"),
          CONSTRAINT "FK_3233def2e85f7cb76c67593c7ef" FOREIGN KEY ("userId")
              REFERENCES public."user" (id) MATCH SIMPLE
              ON UPDATE NO ACTION
              ON DELETE NO ACTION,
          CONSTRAINT "FK_bcd09c0c8b0555b087c31e7b990" FOREIGN KEY ("projectId")
              REFERENCES public.project (id) MATCH SIMPLE
              ON UPDATE NO ACTION
              ON DELETE NO ACTION
      )
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS project_address`);
  }
}
