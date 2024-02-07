import { MigrationInterface, QueryRunner } from 'typeorm';

export class createRecurringDonationTable1702445735585
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                CREATE TABLE recurring_donation (
                id SERIAL PRIMARY KEY,
                "networkId" INT NOT NULL,
                "txHash" text NOT NULL,
                "projectId" INT,
                "anchorContractAddressId" INT,
                "donorId" INT,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                finished BOOLEAN, 
                CONSTRAINT fk_project
                    FOREIGN KEY("projectId") 
                    REFERENCES project(id),
                CONSTRAINT fk_anchor_contract_address
                    FOREIGN KEY("anchorContractAddressId") 
                    REFERENCES anchor_contract_address(id),
                CONSTRAINT fk_donor
                    FOREIGN KEY(donor_id) 
                    REFERENCES "user"(id),
                UNIQUE("txHash", "networkId", "projectId")
            );
            
            CREATE INDEX idx_tx_hash ON recurring_donation(tx_hash);
            CREATE INDEX idx_project_id ON recurring_donation(project_id);
            CREATE INDEX idx_anchor_contract_address_id ON recurring_donation(anchor_contract_address_id);
            CREATE INDEX idx_donor_id ON recurring_donation(donor_id);
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS recurring_donations;`);
  }
}
