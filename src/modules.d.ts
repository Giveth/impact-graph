declare namespace NodeJS {
  export interface ProcessEnv {
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
  }
}
