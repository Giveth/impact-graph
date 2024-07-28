import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token.js';
import { NETWORK_IDS } from '../src/provider.js';

const polygonTokens = [
  {
    symbol: 'AAVE',
    name: 'Aave',
    address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  },
  {
    symbol: 'agEUR',
    name: 'agEUR',
    address: '0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
  },
  {
    symbol: 'ATOM',
    name: 'Cosmos',
    address: '0xac51C4c48Dc3116487eD4BC16542e27B5694Da1b',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '',
  },
  // {
  //   symbol: 'axlUSDC',
  //   name: 'Axelar USDC',
  //   address: '0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed',
  //   isGivbackEligible: true,
  //   networkId: NETWORK_IDS.POLYGON,
  //   decimals: 18,
  //   mainnetAddress: '',
  // },
  {
    symbol: 'BIFI',
    name: 'Beefy.Finance',
    address: '0xFbdd194376de19a88118e84E279b977f165d01b8',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
  },
  {
    symbol: 'DAI',
    name: 'DAI Stablecoin',
    address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  {
    symbol: 'FRAX',
    name: 'Frax',
    address: '0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
  },
  // {
  //   symbol: 'KLIMA',
  //   name: 'Klima DAO',
  //   address: '0x4e78011Ce80ee02d2c3e649Fb657E45898257815',
  //   isGivbackEligible: true,
  //   networkId: NETWORK_IDS.POLYGON,
  //   decimals: 18,
  //   mainnetAddress: '',
  // },
  {
    symbol: 'LDO',
    name: 'Lido DAO Token',
    address: '0xC3C7d422809852031b44ab29EEC9F1EfF2A58756',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
  },
  {
    symbol: 'LINK',
    name: 'ChainLink Token',
    address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  },
  {
    symbol: 'MIMATIC',
    name: 'Mai Finance',
    address: '0xa3Fa99A148fA48D14Ed51d610c367C61876997F1',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x8d6cebd76f18e1558d4db88138e2defb3909fad6',
  },
  // {
  //   symbol: 'MANA',
  //   name: 'Decentraland',
  //   address: '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4',
  //   isGivbackEligible: true,
  //   networkId: NETWORK_IDS.POLYGON,
  //   decimals: 18,
  //   mainnetAddress: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
  // },
  // {
  //   symbol: 'QI',
  //   name: 'Qi Dao',
  //   address: '0x580A84C73811E1839F75d86d75d88cCa0c241fF4',
  //   isGivbackEligible: true,
  //   networkId: NETWORK_IDS.POLYGON,
  //   decimals: 18,
  //   mainnetAddress: '',
  // },
  {
    symbol: 'QUICK',
    name: 'Quickswap (NEW)',
    address: '0xB5C064F955D8e7F38fE0460C556a72987494eE17',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    // This is Quickswap, couldnt find Quickswap (New)
    mainnetAddress: '0xd2bA23dE8a19316A638dc1e7a9ADdA1d74233368',
  },
  {
    symbol: 'WMATIC',
    name: 'Wrapped Matic',
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
  },
  {
    symbol: 'SAND',
    name: 'The Sandbox',
    address: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0',
  },
  {
    symbol: 'TUSD',
    name: 'TrueUSD',
    address: '0x2e1AD108fF1D8C782fcBbB89AAd783aC49586756',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x0000000000085d4780B73119b644AE5ecd22b376',
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  {
    symbol: 'PAXG',
    name: 'Paxos Gold',
    address: '0x553d3D295e0f695B9228246232eDF400ed3560B5',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
  },
  {
    symbol: 'BAL',
    name: 'Balancer',
    address: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '',
  },
  {
    symbol: 'CRV',
    name: 'Curve Finance',
    address: '0x172370d5cd63279efa6d502dab29171933a610af',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0xba100000625a3754423978a60c9317c58a424e3D',
  },
  {
    symbol: 'ANKR',
    name: 'Ankr',
    address: '0x101A023270368c0D50BFfb62780F4aFd4ea79C35',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x8290333cef9e6d528dd5618fb97a76f268f3edd4',
  },
  {
    symbol: 'stMATIC',
    name: 'Staked MATIC',
    address: '0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x9ee91F9f426fA633d227f7a9b000E28b9dfd8599',
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
    decimals: 18,
    mainnetAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
];

export class insertPolygonGivbackEligibleTokens1678950910841
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(
      Token,
      polygonTokens.map(t => {
        t.address = t.address?.toLowerCase();
        t.mainnetAddress = t.mainnetAddress?.toLowerCase();
        return t;
      }),
    );

    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${NETWORK_IDS.POLYGON} AND symbol != 'MATIC'
            `);

    const givethOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='giveth'`)
    )[0];

    const traceOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='trace'`)
    )[0];

    for (const token of tokens) {
      // Relate all Polygon tokens to Giveth and Trace organizations
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id}),
        (${token.id}, ${traceOrganization.id})
      ;`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${NETWORK_IDS.POLYGON} AND symbol != 'MATIC'
            `);
    await queryRunner.query(
      `DELETE FROM organization_tokens_token WHERE "tokenId" IN (${tokens
        .map(token => token.id)
        .join(',')})`,
    );
    await queryRunner.query(
      `
        DELETE from token
        WHERE "networkId" = ${NETWORK_IDS.POLYGON} AND symbol != 'MATIC'
      `,
    );
  }
}
