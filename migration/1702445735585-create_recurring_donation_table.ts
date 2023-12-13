import { MigrationInterface, QueryRunner } from 'typeorm';

export class createRecurringDonationTable1702445735585
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                CREATE TABLE recurring_donations (
                id SERIAL PRIMARY KEY,
                network_id INT NOT NULL,
                tx_hash text NOT NULL,
                project_id INT,
                anchor_contract_address_id INT,
                donor_id INT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_project
                    FOREIGN KEY(project_id) 
                    REFERENCES projects(id),
                CONSTRAINT fk_anchor_contract_address
                    FOREIGN KEY(anchor_contract_address_id) 
                    REFERENCES anchor_contract_addresses(id),
                CONSTRAINT fk_donor
                    FOREIGN KEY(donor_id) 
                    REFERENCES users(id),
                UNIQUE(tx_hash, network_id, project_id)
            );
            
            CREATE INDEX idx_tx_hash ON recurring_donations(tx_hash);
            CREATE INDEX idx_project_id ON recurring_donations(project_id);
            CREATE INDEX idx_anchor_contract_address_id ON recurring_donations(anchor_contract_address_id);
            CREATE INDEX idx_donor_id ON recurring_donations(donor_id);
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS recurring_donations;`);
  }
}
