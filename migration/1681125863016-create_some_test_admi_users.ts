import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcrypt';
import config from '../src/config.js';
import { generateRandomEtheriumAddress } from '../test/testUtils.js';
import { UserRole } from '../src/entities/user.js';

export class createSomeTestAdmiUsers1681125863016
  implements MigrationInterface
{
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
                VALUES('campaignManager@giveth.io', '${generateRandomEtheriumAddress()}', '${
                  UserRole.CAMPAIGN_MANAGER
                }','wallet', 'test', '${hash}');
              `);

    await queryRunner.query(`
                INSERT INTO public.user (email, "walletAddress", role,"loginType", name,"encryptedPassword") 
                VALUES('reviewer@giveth.io', '${generateRandomEtheriumAddress()}', '${
                  UserRole.VERIFICATION_FORM_REVIEWER
                }','wallet', 'test', '${hash}');
              `);

    await queryRunner.query(`
                INSERT INTO public.user (email, "walletAddress", role,"loginType", name,"encryptedPassword") 
                VALUES('operator@giveth.io', '${generateRandomEtheriumAddress()}', '${
                  UserRole.OPERATOR
                }','wallet', 'test', '${hash}');
              `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
               DELETE FROM public.user where email='reviewer@giveth.io'`);
    await queryRunner.query(`
               DELETE FROM public.user where email='operator@giveth.io'`);
    await queryRunner.query(`
               DELETE FROM public.user where email='campaignManager@giveth.io'`);
  }
}
