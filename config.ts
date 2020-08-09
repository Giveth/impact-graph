import * as dotenv from 'dotenv'

dotenv.config()
const envVars = [
  'JWT_SECRET',
  'JWT_MAX_AGE',
  'ETHEREUM_NODE_URL',
  'TYPEORM_DATABASE_TYPE',
  'TYPEORM_DATABASE_NAME',
  'TYPEORM_DATABASE_USER',
  'TYPEORM_DATABASE_PASSWORD',
  'TYPEORM_DATABASE_HOST',
  'TYPEORM_DATABASE_PORT',
  'TYPEORM_LOGGING',
  'TYPEORM_DROP_SCHEMA',
  'APOLLO_KEY',
  'REGISTER_USERNAME_PASSWORD'
]

export default class Config {
  JWT_SECRET: string
  JWT_MAX_AGE: string
  ETHEREUM_NODE_URL: string
  TYPEORM_DATABASE_TYPE: string
  TYPEORM_DATABASE_NAME: string
  TYPEORM_DATABASE_USER: string
  TYPEORM_DATABASE_PASSWORD: string
  TYPEORM_DATABASE_HOST: string
  TYPEORM_DATABASE_PORT: string
  TYPEORM_LOGGING: string
  TYPEORM_DROP_SCHEMA: string
  APOLLO_KEY: string
  REGISTER_USERNAME_PASSWORD: string
  DB_DROP_SEED: boolean

  get (envVar: string): string {
    return this[envVar]
  }

  constructor (envFile: object) {
    envVars.forEach(envVar => {
      if (envFile[envVar]) {
        this[envVar] = envFile[envVar]
        // console.log(`envVar ---> : ${this[envVar]}`)
      } else {
        throw new Error(`Need to provide a ${envVar} in the .env`)
      }
    })
  }
}
