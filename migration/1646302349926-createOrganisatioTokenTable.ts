import { MigrationInterface, QueryRunner } from 'typeorm';

export class createOrganisatioTokenTable1646302349926
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS organization_tokens_token
        (
            "organizationId" integer NOT NULL,
            "tokenId" integer NOT NULL,
            CONSTRAINT "PK_b811802b9de817da8820f0e60f1" PRIMARY KEY ("organizationId", "tokenId"),
            CONSTRAINT "FK_2f48b3f2fa2c4d25ab3aab7167e" FOREIGN KEY ("tokenId")
                REFERENCES token (id) MATCH SIMPLE
                ON UPDATE CASCADE
                ON DELETE CASCADE,
            CONSTRAINT "FK_c59fe0d2f965ccb09648c5d4a9c" FOREIGN KEY ("organizationId")
                REFERENCES organization (id) MATCH SIMPLE
                ON UPDATE CASCADE
                ON DELETE CASCADE
        )
        `);

    // await queryRunner.query(`
    //     CREATE TABLE IF NOT EXISTS public.token_organizations_organization
    //     (
    //         "tokenId" integer NOT NULL,
    //         "organizationId" integer NOT NULL,
    //         CONSTRAINT "PK_6b2c247d62517df75382916cda3" PRIMARY KEY ("tokenId", "organizationId"),
    //         CONSTRAINT "FK_1c28a8f33b20f099ab63d7b22e4" FOREIGN KEY ("tokenId")
    //             REFERENCES public.token (id) MATCH SIMPLE
    //             ON UPDATE CASCADE
    //             ON DELETE CASCADE,
    //         CONSTRAINT "FK_764af26b49daec8ab1620ceb66c" FOREIGN KEY ("organizationId")
    //             REFERENCES public.organization (id) MATCH SIMPLE
    //             ON UPDATE CASCADE
    //             ON DELETE CASCADE
    //     )
    //
    // `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
