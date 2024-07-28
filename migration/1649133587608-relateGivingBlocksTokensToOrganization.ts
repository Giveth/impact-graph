import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../src/config.js';

// validated this list names from the frontend list manually
// removed eth as this is related on another migration
// Symbols can be repeated so preferred custom names
const givingBlockTokenNames = [
  'GIV Token',
  'ZRX 0x',
  '1INCH Token',
  'Lend Aave',
  'Bancor',
  'Basic Attention Token',
  'Balancer',
  'Chainlink',
  'Compound',
  'Curve DAO Token',
  'Dai',
  'Decentraland',
  'Enjin Coin',
  'Gemini Dollar',
  'Kyber Network',
  'Loopring',
  'Maker',
  'Wrapped MIR Token',
  'PAX Gold',
  'Matic Network',
  'Ren',
  'Sushi Token',
  'Synthetix Network Token',
  'TerraUSD',
  'yearn.finance',
  'Quant',
  'Numeraire',
  'SHIBA INU',
  'Alchemix',
  'Amp',
  'Ankr Network',
  'Axie Infinity Shard',
  'BarnBridge Governance Token',
  'Cryptex',
  'Fantom Token',
  'Graph Token',
  'Injective Token',
  'Livepeer Token',
  'Moss Carbon Credit',
  'Orchid',
  'The Sandbox',
  'Skale',
  'Smooth Love Potion',
  'Somnium Space Cubes',
  'Storj',
  'Wrapped LUNA Token',
  'UMA Voting Token v1',
  'Uniswap',
  'Wrapped Centrifuge',
  'Audius',
  'Mask Network',
  'Radicle',
  'API3',
  'The Burn Token',
  'SuperRare',
  'Fetch',
];

export class relateGivingBlocksTokensToOrganization1649133587608
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const givingBlockOrganization = (
      await queryRunner.query(`SELECT * FROM organization
                WHERE label='givingBlock'`)
    )[0];

    const tokens = await queryRunner.query(`
        SELECT *
        FROM token
        WHERE name IN (${`'${givingBlockTokenNames.join("','")}'`})
    `);

    const insertTokenValues = tokens.map(token => {
      return `(${token.id}, ${givingBlockOrganization.id})`;
    });

    await queryRunner.query(`
        INSERT INTO organization_tokens_token ("tokenId","organizationId")
        VALUES ${insertTokenValues.join(',')};
    `);

    const environment = config.get('ENVIRONMENT') as string;
    if (environment !== 'production') {
      const ropstenNativeTokens = await queryRunner.query(`
              SELECT * FROM token
              WHERE (symbol='ETH' OR symbol='YAY') and "networkId"=3
          `);

      await queryRunner.query(
        `INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
            (${ropstenNativeTokens[0].id}, ${givingBlockOrganization.id}),
            (${ropstenNativeTokens[1].id}, ${givingBlockOrganization.id})
          ;`,
      );
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
