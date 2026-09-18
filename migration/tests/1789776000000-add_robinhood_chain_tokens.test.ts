import { assert } from 'chai';
import axios from 'axios';
import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../../src/orm';
import { NETWORK_IDS } from '../../src/provider';
import { ORGANIZATION_LABELS } from '../../src/entities/organization';
import { AddRobinhoodChainTokens1789776000000 } from '../1789776000000-add_robinhood_chain_tokens';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import { addNewProjectAddress } from '../../src/repositories/projectAddressRepository';
import { getTokensDetailsQuery } from '../../test/graphqlQueries';
import { ChainType } from '../../src/types/network';

// The migration branches on config.get('ENVIRONMENT'), which reads
// process.env.ENVIRONMENT directly (config wraps process.env by reference),
// so the production path is exercised by toggling the env var around up().

const EXPECTED_TESTNET_TOKENS = [
  {
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    coingeckoId: 'ethereum',
    isStableCoin: true,
  },
  {
    symbol: 'WETH',
    address: '0x7943e237c7f95da44e0301572d358911207852fa',
    decimals: 18,
    coingeckoId: 'weth',
    isStableCoin: false,
  },
  {
    symbol: 'USDC.e',
    address: '0x71c6e1c209a4e3d4bd9911b2d53c98023a56c32f',
    decimals: 6,
    coingeckoId: null,
    isStableCoin: true,
  },
];

const EXPECTED_MAINNET_TOKENS = [
  {
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    coingeckoId: 'ethereum',
    isStableCoin: false,
  },
  {
    symbol: 'USDG',
    address: '0x5fc5360d0400a0fd4f2af552add042d716f1d168',
    decimals: 6,
    coingeckoId: 'global-dollar',
    isStableCoin: true,
  },
  {
    symbol: 'USDC',
    address: '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8',
    decimals: 6,
    coingeckoId: 'usd-coin',
    isStableCoin: true,
  },
];

const getProjectAcceptTokensWithAddressQuery = `
  query($projectId: Float!) {
    getProjectAcceptTokens(projectId: $projectId) {
      id
      symbol
      networkId
      address
      decimals
      name
    }
  }
`;

const ROBINHOOD_NETWORK_IDS = [
  NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET,
  NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET,
];

const deleteRobinhoodTokens = async (queryRunner: QueryRunner) => {
  await queryRunner.query(`
    DELETE FROM organization_tokens_token
    WHERE "tokenId" IN (
      SELECT id FROM token
      WHERE "networkId" IN (${ROBINHOOD_NETWORK_IDS.join(',')})
    );
  `);
  await queryRunner.query(`
    DELETE FROM token
    WHERE "networkId" IN (${ROBINHOOD_NETWORK_IDS.join(',')});
  `);
};

const getAcceptedTokens = async (projectId: number) => {
  const result = await axios.post(graphqlUrl, {
    query: getProjectAcceptTokensWithAddressQuery,
    variables: { projectId },
  });
  return result.data.data.getProjectAcceptTokens;
};

const assertOrgJoins = async (
  queryRunner: QueryRunner,
  networkId: number,
  expectedTokenCount: number,
) => {
  const joins: { tokenId: number; label: string }[] = await queryRunner.query(
    `SELECT ott."tokenId", o.label
     FROM organization_tokens_token ott
     JOIN organization o ON o.id = ott."organizationId"
     WHERE ott."tokenId" IN (
       SELECT id FROM token WHERE "networkId" = ${networkId}
     )`,
  );
  // Every seeded token must be joined to both the giveth and trace orgs
  assert.equal(joins.length, expectedTokenCount * 2);
  const labelsPerToken = new Map<number, string[]>();
  for (const join of joins) {
    const labels = labelsPerToken.get(join.tokenId) || [];
    labels.push(join.label);
    labelsPerToken.set(join.tokenId, labels);
  }
  assert.equal(labelsPerToken.size, expectedTokenCount);
  for (const labels of labelsPerToken.values()) {
    assert.sameMembers(labels, [
      ORGANIZATION_LABELS.GIVETH,
      ORGANIZATION_LABELS.TRACE,
    ]);
  }
};

const assertTokenRows = (
  rows: {
    symbol: string;
    address: string;
    decimals: number;
    coingeckoId: string | null;
    isStableCoin: boolean;
    networkId: number;
  }[],
  expected: typeof EXPECTED_TESTNET_TOKENS,
  networkId: number,
) => {
  assert.equal(rows.length, expected.length);
  const picked = rows
    .map(row => ({
      symbol: row.symbol,
      address: row.address,
      decimals: row.decimals,
      coingeckoId: row.coingeckoId,
      isStableCoin: row.isStableCoin,
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
  const sortedExpected = [...expected].sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  );
  assert.deepEqual(picked, sortedExpected);
  rows.forEach(row => assert.equal(row.networkId, networkId));
};

let queryRunner: QueryRunner;
const migration = new AddRobinhoodChainTokens1789776000000();
const originalEnvironment = process.env.ENVIRONMENT;

describe('AddRobinhoodChainTokens migration', () => {
  before(async () => {
    await AppDataSource.initialize();
    queryRunner = AppDataSource.getDataSource().createQueryRunner();
    await queryRunner.connect();
  });

  after(async () => {
    process.env.ENVIRONMENT = originalEnvironment;
    await deleteRobinhoodTokens(queryRunner);
    await queryRunner.release();
  });

  it('accepted-tokens contains no Robinhood token when seeding is absent, even for a project holding other-network addresses', async () => {
    await deleteRobinhoodTokens(queryRunner);

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      networkId: NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET,
    });
    // Same project also holds an Ethereum mainnet recipient address — a
    // non-empty result here must NOT be able to satisfy the Robinhood check
    await addNewProjectAddress({
      project,
      user: project.adminUser,
      isRecipient: true,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.MAIN_NET,
      chainType: ChainType.EVM,
    });

    const tokens = await getAcceptedTokens(project.id);
    // The query does join: Ethereum tokens come back for the mainnet address
    assert.isNotEmpty(tokens);
    tokens.forEach(token => {
      assert.notInclude(ROBINHOOD_NETWORK_IDS, token.networkId);
    });
  });

  it('up() in a non-production environment seeds the testnet rows and org joins, and accepted-tokens returns them explicitly', async () => {
    await deleteRobinhoodTokens(queryRunner);
    process.env.ENVIRONMENT = '';
    try {
      await migration.up(queryRunner);
    } finally {
      process.env.ENVIRONMENT = originalEnvironment;
    }

    const rows = await queryRunner.query(
      `SELECT * FROM token WHERE "networkId" = ${NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET}`,
    );
    assertTokenRows(
      rows,
      EXPECTED_TESTNET_TOKENS,
      NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET,
    );
    await assertOrgJoins(
      queryRunner,
      NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET,
      EXPECTED_TESTNET_TOKENS.length,
    );

    const expected = EXPECTED_TESTNET_TOKENS.map(token => ({
      networkId: NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET,
      address: token.address,
      symbol: token.symbol,
    })).sort((a, b) => a.symbol.localeCompare(b.symbol));

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      networkId: NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET,
    });
    const tokens = await getAcceptedTokens(project.id);
    const returned = tokens
      .map((token: { networkId: number; address: string; symbol: string }) => ({
        networkId: token.networkId,
        address: token.address,
        symbol: token.symbol,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
    assert.deepEqual(returned, expected);

    // The trace organization must serve the same seeded tokens through the
    // same join — the migration inserts join rows for both organizations
    const traceProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
      networkId: NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET,
    });
    const traceTokens = await getAcceptedTokens(traceProject.id);
    const traceReturned = traceTokens
      .map((token: { networkId: number; address: string; symbol: string }) => ({
        networkId: token.networkId,
        address: token.address,
        symbol: token.symbol,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
    assert.deepEqual(traceReturned, expected);
  });

  it('up() in production seeds the mainnet rows and org joins, and accepted-tokens returns them explicitly', async () => {
    await deleteRobinhoodTokens(queryRunner);
    process.env.ENVIRONMENT = 'production';
    try {
      await migration.up(queryRunner);
    } finally {
      process.env.ENVIRONMENT = originalEnvironment;
    }

    const rows = await queryRunner.query(
      `SELECT * FROM token WHERE "networkId" = ${NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET}`,
    );
    assertTokenRows(
      rows,
      EXPECTED_MAINNET_TOKENS,
      NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET,
    );
    await assertOrgJoins(
      queryRunner,
      NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET,
      EXPECTED_MAINNET_TOKENS.length,
    );

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      networkId: NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET,
    });
    const tokens = await getAcceptedTokens(project.id);
    const returned = tokens
      .map((token: { networkId: number; address: string; symbol: string }) => ({
        networkId: token.networkId,
        address: token.address,
        symbol: token.symbol,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
    const expected = EXPECTED_MAINNET_TOKENS.map(token => ({
      networkId: NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET,
      address: token.address,
      symbol: token.symbol,
    })).sort((a, b) => a.symbol.localeCompare(b.symbol));
    assert.deepEqual(returned, expected);
  });

  it('accepted-tokens stops returning Robinhood tokens after down()', async () => {
    await deleteRobinhoodTokens(queryRunner);
    process.env.ENVIRONMENT = 'production';
    try {
      await migration.up(queryRunner);
    } finally {
      process.env.ENVIRONMENT = originalEnvironment;
    }

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      networkId: NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET,
    });
    let tokens = await getAcceptedTokens(project.id);
    assert.isNotEmpty(
      tokens.filter(
        token => token.networkId === NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET,
      ),
    );

    process.env.ENVIRONMENT = 'production';
    try {
      await migration.down(queryRunner);
    } finally {
      process.env.ENVIRONMENT = originalEnvironment;
    }

    tokens = await getAcceptedTokens(project.id);
    const robinhoodTokens = tokens.filter(token =>
      ROBINHOOD_NETWORK_IDS.includes(token.networkId),
    );
    assert.isEmpty(robinhoodTokens);
  });

  it('getTokensDetails spot-checks a seeded token by address and network id', async () => {
    await deleteRobinhoodTokens(queryRunner);
    process.env.ENVIRONMENT = '';
    try {
      await migration.up(queryRunner);
    } finally {
      process.env.ENVIRONMENT = originalEnvironment;
    }

    const result = await axios.post(graphqlUrl, {
      query: getTokensDetailsQuery,
      variables: {
        address: '0x71c6e1c209a4e3d4bd9911b2d53c98023a56c32f',
        networkId: NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET,
      },
    });
    const token = result.data.data.getTokensDetails;
    assert.equal(token.symbol, 'USDC.e');
    assert.equal(token.networkId, NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET);
    assert.equal(token.decimals, 6);
  });
});
