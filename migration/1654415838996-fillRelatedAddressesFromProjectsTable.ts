import { MigrationInterface, QueryRunner } from 'typeorm';
import { Project } from '../src/entities/project.js';
import { NETWORK_IDS } from '../src/provider.js';
import { ENVIRONMENTS } from '../src/utils/utils.js';

const insertRelatedAddress = async (params: {
  queryRunner: QueryRunner;
  project: Project;
  networkId: number;
}): Promise<void> => {
  const { queryRunner, project, networkId } = params;
  await queryRunner.query(
    `
                  INSERT INTO project_address(
                  "networkId", address, "projectId", "userId", "isRecipient")
                  VALUES (${networkId}, '${project.walletAddress?.toLowerCase()}', ${
                    project.id
                  }, ${project.adminUserId}, true);
              `,
  );
};

export class fillRelatedAddressesFromProjectsTable1654415838996
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');
    if (!projectTableExists) {
      // eslint-disable-next-line no-console
      console.log(
        'The project table doesnt exist, so there is no need to relate it to relatedAddreses',
      );
      return;
    }
    const userTableExists = await queryRunner.hasTable('user');

    if (!userTableExists) {
      // eslint-disable-next-line no-console
      console.log(
        'The user table doesnt exist, so there is no need to relate it to relatedAddresses',
      );
      return;
    }

    // The project_address has changed so first of all we should drop existing table
    await queryRunner.query(
      `
                 DROP TABLE IF EXISTS project_address;
          `,
    );
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

    const projects = await queryRunner.query(`SELECT * FROM project`);
    for (const project of projects) {
      await insertRelatedAddress({
        project,
        queryRunner,
        networkId: NETWORK_IDS.XDAI,
      });

      // We have set ENVIRONMENT in docker-compose
      const environment = process.env.ENVIRONMENT;
      if (environment === ENVIRONMENTS.PRODUCTION) {
        await insertRelatedAddress({
          project,
          queryRunner,
          networkId: NETWORK_IDS.MAIN_NET,
        });
      } else {
        await insertRelatedAddress({
          project,
          queryRunner,
          networkId: NETWORK_IDS.ROPSTEN,
        });
      }
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
