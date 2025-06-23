import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImplementSingleTableInheritance1750123930818
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add cause-specific columns to the project table
    await queryRunner.query(`
      ALTER TABLE public.project 
      ADD COLUMN IF NOT EXISTS "projectType" varchar NOT NULL DEFAULT 'project',
      ADD COLUMN IF NOT EXISTS "chainId" integer,
      ADD COLUMN IF NOT EXISTS "depositTxHash" text,
      ADD COLUMN IF NOT EXISTS "depositTxChainId" integer,
      ADD COLUMN IF NOT EXISTS "totalRaised" float NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "totalDistributed" float NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "totalDonated" float NOT NULL DEFAULT 0
    `);

    // Add unique constraint to depositTxHash if it doesn't exist
    const constraintExists = await queryRunner.hasColumn(
      'project',
      'depositTxHash',
    );
    if (constraintExists) {
      // Check if the unique constraint already exists
      const constraintCheck = await queryRunner.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'project' 
        AND constraint_name = 'UQ_project_depositTxHash'
        AND constraint_type = 'UNIQUE'
      `);

      if (constraintCheck.length === 0) {
        await queryRunner.query(`
          ALTER TABLE public.project 
          ADD CONSTRAINT "UQ_project_depositTxHash" UNIQUE ("depositTxHash");
        `);
      }
    }

    // Add projectType column to project_update table
    await queryRunner.query(`
      ALTER TABLE public.project_update 
      ADD COLUMN IF NOT EXISTS "projectType" varchar DEFAULT 'project';
    `);

    // Add indexes for cause-specific fields
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_projectType" 
      ON public.project USING btree ("projectType" ASC NULLS LAST);
    `);

    // Drop all foreign key constraints that reference the cause table
    await queryRunner.query(`
      -- Drop foreign key constraints from cause_project table
      ALTER TABLE public.cause_project 
      DROP CONSTRAINT IF EXISTS "FK_cause_project_cause",
      DROP CONSTRAINT IF EXISTS "FK_cause_project_project";
    `);

    // Check if project_causes_cause table exists and drop constraints if it does
    const projectCausesCauseExists = await queryRunner.hasTable(
      'project_causes_cause',
    );
    if (projectCausesCauseExists) {
      await queryRunner.query(`
        -- Drop foreign key constraints from project_causes_cause table
        ALTER TABLE public.project_causes_cause 
        DROP CONSTRAINT IF EXISTS "FK_project_causes_cause_cause",
        DROP CONSTRAINT IF EXISTS "FK_project_causes_cause_project";
      `);

      // Drop any other tables that might reference cause
      await queryRunner.query(`
        DROP TABLE IF EXISTS public.project_causes_cause CASCADE;
      `);
    }

    // Add new foreign key constraints pointing to project table
    await queryRunner.query(`
      ALTER TABLE public.cause_project 
      ADD CONSTRAINT "FK_cause_project_cause" 
      FOREIGN KEY ("causeId") REFERENCES public.project ("id") 
      ON UPDATE NO ACTION ON DELETE NO ACTION,
      
      ADD CONSTRAINT "FK_cause_project_project" 
      FOREIGN KEY ("projectId") REFERENCES public.project ("id") 
      ON UPDATE NO ACTION ON DELETE NO ACTION;
    `);

    // Now we can safely drop the cause table
    await queryRunner.query(`
      DROP TABLE IF EXISTS public.cause CASCADE;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
