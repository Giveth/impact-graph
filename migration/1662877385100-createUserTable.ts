import { MigrationInterface, QueryRunner } from 'typeorm';

export class createUserTable1662877385100 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const userTableExists = await queryRunner.hasTable('public.user');

    if (userTableExists) {
      // eslint-disable-next-line no-console
      console.log('user table already exists');
      return;
    }
    await queryRunner.query(
      `
              CREATE TYPE user_role_enum AS ENUM ('reviewer', 'operator', 'restricted', 'admin');

              CREATE TABLE IF NOT EXISTS public."user"
              (
                  id SERIAL NOT NULL,
                  role user_role_enum NOT NULL DEFAULT 'restricted'::user_role_enum,
                  email character varying COLLATE pg_catalog."default",
                  "firstName" character varying COLLATE pg_catalog."default",
                  "lastName" character varying COLLATE pg_catalog."default",
                  name character varying COLLATE pg_catalog."default",
                  "walletAddress" character varying COLLATE pg_catalog."default" NOT NULL,
                  password character varying COLLATE pg_catalog."default",
                  "encryptedPassword" character varying COLLATE pg_catalog."default",
                  avatar character varying COLLATE pg_catalog."default",
                  url character varying COLLATE pg_catalog."default",
                  location character varying COLLATE pg_catalog."default",
                  "loginType" character varying COLLATE pg_catalog."default" NOT NULL,
                  "dId" character varying COLLATE pg_catalog."default",
                  confirmed boolean NOT NULL DEFAULT false,
                  "segmentIdentified" boolean NOT NULL DEFAULT false,
                  "totalDonated" real DEFAULT 0,
                  "totalReceived" real DEFAULT 0,
                  CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY (id),
                  CONSTRAINT "UQ_efbd1135797e451d834bcf88cd2" UNIQUE ("walletAddress")
              )
            `,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
