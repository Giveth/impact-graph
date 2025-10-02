import path from 'path';
import * as dotenv from 'dotenv';

const configPath = path.resolve(
  __dirname,
  `../config/${process.env.NODE_ENV || ''}.env`,
);
const loadConfigResult = dotenv.config({
  path: configPath,
});

if (loadConfigResult.error) {
  // eslint-disable-next-line no-console
  console.log('Load process.env error', {
    path: configPath,
    error: loadConfigResult.error,
  });
  throw loadConfigResult.error;
}

const envVars = [
  'JWT_SECRET',
  'JWT_MAX_AGE',
  'TYPEORM_DATABASE_TYPE',
  'TYPEORM_DATABASE_NAME',
  'TYPEORM_DATABASE_USER',
  'TYPEORM_DATABASE_PASSWORD',
  'TYPEORM_DATABASE_HOST',
  'TYPEORM_DATABASE_PORT',
  'TYPEORM_LOGGING',
  'DROP_DATABASE',
  'SEED_PASSWORD',
  'APOLLO_KEY',
  'STRIPE_KEY',
  'STRIPE_SECRET',
  'STRIPE_APPLICATION_FEE',
  'STRIPE_WEBHOOK_SECRET',
  'PINATA_API_KEY',
  'PINATA_SECRET_API_KEY',
  'SEED_DATABASE',
  'SERVER_ADMIN_EMAIL',
  'DEFAULT_ORGANISATION',
  'UPLOAD_FILE_MAX_SIZE',
  'HOSTNAME_WHITELIST',
  'SENTRY_ID',
  'SENTRY_TOKEN',
  'NETLIFY_DEPLOY_HOOK',
  'ENVIRONMENT',
  'WEBSITE_URL',
  'OUR_SECRET',
  // 'XDAI_NODE_HTTP_URL',
  'TRACE_FILE_UPLOADER_PASSWORD',
  'GIVPOWER_BOOSTING_USER_PROJECTS_LIMIT',
  'GIVPOWER_BOOSTING_PERCENTAGE_PRECISION',
  'GIVPOWER_ROUND_DURATION',
  'GIVBACK_MAX_FACTOR',
  'GIVBACK_MIN_FACTOR',
  'DONATION_VERIFICAITON_EXPIRATION_HOURS',
  'CAUSE_PROJECT_IP_WHITELIST',
  'MAX_ACTIVE_ROUNDS',
];

interface requiredEnv {
  JWT_SECRET: string;
  JWT_MAX_AGE: string;
  ETHEREUM_NETWORK: string;
  TYPEORM_DATABASE_TYPE: string;
  TYPEORM_DATABASE_NAME: string;
  TYPEORM_DATABASE_USER: string;
  TYPEORM_DATABASE_PASSWORD: string;
  TYPEORM_DATABASE_HOST: string;
  TYPEORM_DATABASE_PORT: string;
  TYPEORM_LOGGING: string;
  DROP_DATABASE: string;
  SEED_PASSWORD: string;
  APOLLO_KEY: string;

  STRIPE_KEY: string;
  STRIPE_SECRET: string;
  STRIPE_APPLICATION_FEE: number;
  STRIPE_WEBHOOK_SECRET: string;

  PINATA_API_KEY: string;
  PINATA_SECRET_API_KEY: string;
  UPLOAD_FILE_MAX_SIZE: string;
  HOSTNAME_WHITELIST: string; // Comma separated
  SENTRY_ID: string;
  SENTRY_TOKEN: string;
  NETLIFY_DEPLOY_HOOK: string;
  DEFAULT_ORGANISATION: string;
  ENVIRONMENT: string;
  WEBSITE_URL: string;
  OUR_SECRET: string;
  XDAI_NODE_HTTP_URL: string;
  TRACE_FILE_UPLOADER_PASSWORD: string;
  GIVPOWER_BOOSTING_USER_PROJECTS_LIMIT: string;
  GIVPOWER_BOOSTING_PERCENTAGE_PRECISION: string;
  GIVPOWER_ROUND_DURATION: string;
  CAUSE_PROJECT_IP_WHITELIST: string; // Comma separated IP addresses
  MAX_ACTIVE_ROUNDS: string;
}

class Config {
  env: requiredEnv;

  constructor(envFile: any) {
    this.env = envFile;
    this.validateEnv(envFile);
  }

  // Have this - replace it!
  validateEnv(envFile) {
    envVars.forEach(envVar => {
      if (envFile[envVar]) {
        this[envVar] = envFile[envVar];
        // logger.debug(`envVar ---> : ${this[envVar]}`)
      } else {
        throw new Error(`Need to provide a ${envVar} in the .env`);
      }
    });
  }

  get(envVar: string): string | number {
    // I think it's an unnecessary checking, because may we have some optional config, but this checking make all
    // config variables required

    // if (!this.env[envVar]) {
    //   throw new Error(`${envVar} is an invalid env variable`)
    // }
    return this.env[envVar];
  }
}

const config = new Config(process.env);

export default config;
