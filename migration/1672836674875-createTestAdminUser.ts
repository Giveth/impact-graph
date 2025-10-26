import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../src/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');

export class createTestAdminUser1672836674875 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;
    if (environment !== 'local' && environment !== 'test') {
      // eslint-disable-next-line no-console
      console.log('We just create admin user in local and test ENVs');
      return;
    }
    const hash = await bcrypt.hash('admin', Number(process.env.BCRYPT_SALT));
    await queryRunner.query(`
                INSERT INTO public.user (email, "walletAddress", role,"loginType", name,"encryptedPassword") 
                VALUES('test-admin@giveth.io', '0x66F014F90cdE78130e143b00F8Bd3F77c73bb0Bc', 'admin','wallet', 'test', '${hash}');
              `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
               DELETE FROM public.user where email='test-admin@giveth.io'`);
  }
}
