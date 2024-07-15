import { assert } from 'chai';
import { generateRandomEvmTxHash } from '../../../../test/testUtils';
import { findTokenByTokenAddress } from '../../../repositories/tokenRepository';
import {
  Organization,
  ORGANIZATION_LABELS,
} from '../../../entities/organization';
import { Token } from '../../../entities/token';
import {
  createToken,
  generateOrganizationList,
  linkOrganizations,
  permute,
} from './tokenTab';

describe('createToken() test cases', createTokenTestCases);
describe('linkOrganizations() test cases', linkOrganizationsTestCases);
describe(
  'generateOrganizationListTestCases',
  generateOrganizationListTestCases,
);
describe('permuteTestCases', permuteTestCases);

const recursiveFactorial = (n: number) => {
  if (n === 0) {
    return 1;
  }
  return n * recursiveFactorial(n - 1);
};

function permuteTestCases() {
  // it should follow the combination formula without repetition
  // n = elements to choose from
  // k = elements chosen (array lenghs to generate)
  // Ck(n) = ( n  k )  = n! / k!(n−k)!
  it('should permute 4 items with lenght 2 for a result of 6 combinations', async () => {
    const n = 4;
    const items = ['a', 'b', 'c', 'd'];
    const k = 2;
    const nFact = recursiveFactorial(n);
    const kFact = recursiveFactorial(k);
    const differenceFact = recursiveFactorial(n - k);
    // Ck(n) = ( n  k )  = n! / k!(n−k)!
    const result = nFact / (kFact * differenceFact);

    const organizationsPermuted = permute(items, k);
    assert.equal(organizationsPermuted.length, 6);
    assert.equal(organizationsPermuted.length, result);
  });
  it('should permute 4 items with length 3 for a result of 4 combinations', async () => {
    const n = 4;
    const items = ['a', 'b', 'c', 'd'];
    const k = 3;
    const nFact = recursiveFactorial(n);
    const kFact = recursiveFactorial(k);
    const differenceFact = recursiveFactorial(n - k);
    // Ck(n) = ( n  k )  = n! / k!(n−k)!
    const result = nFact / (kFact * differenceFact);
    const organizationsPermuted = permute(items, k);
    assert.equal(organizationsPermuted.length, 4);
    assert.equal(organizationsPermuted.length, result);
  });
}

function generateOrganizationListTestCases() {
  // this includes all organizations option
  it('should return 15 permutations option when 4 organizations are present', async () => {
    let totalPermutations = 0;
    const [, n] = await Organization.createQueryBuilder('organization')
      .orderBy('organization.id')
      .getManyAndCount();
    // there is no take 0 elements case
    for (let i = 1; i <= n; i++) {
      const k = i;
      const nFact = recursiveFactorial(n);
      const kFact = recursiveFactorial(k);
      const differenceFact = recursiveFactorial(n - k);
      // Ck(n) = ( n  k )  = n! / k!(n−k)!
      const result = nFact / (kFact * differenceFact);
      totalPermutations = totalPermutations + result;
    }

    const organizationDropdown = await generateOrganizationList();
    assert.equal(organizationDropdown.length, 15);
    assert.equal(organizationDropdown.length, totalPermutations);
  });
  it('should return 31 permutations when 5 organizations are present', async () => {
    let totalPermutations = 0;
    const organization = Organization.create({
      name: 'NewOrg',
      label: 'neworg',
      supportCustomTokens: true,
      website: 'neworg.org',
    });
    await organization.save();

    const [, n] = await Organization.createQueryBuilder('organization')
      .orderBy('organization.id')
      .getManyAndCount();
    // there is no take 0 elements case
    for (let i = 1; i <= n; i++) {
      const k = i;
      const nFact = recursiveFactorial(n);
      const kFact = recursiveFactorial(k);
      const differenceFact = recursiveFactorial(n - k);
      // Ck(n) = ( n  k )  = n! / k!(n−k)!
      const result = nFact / (kFact * differenceFact);
      totalPermutations = totalPermutations + result;
    }

    const organizationDropdown = await generateOrganizationList();
    assert.equal(organizationDropdown.length, 31);
    assert.equal(organizationDropdown.length, totalPermutations);
  });
}

const DRGTTokenAddress = generateRandomEvmTxHash();
function createTokenTestCases() {
  it('should create token when unique it is unique by network, address', async () => {
    await createToken(
      {
        query: {},
        payload: {
          address: DRGTTokenAddress,
          decimals: 18,
          isGivbackEligible: true,
          mainnetAddress: '',
          name: 'DragonToken',
          networkId: 1,
          symbol: 'DRGT',
          organizations: 'giveth,trace',
        },
      },
      {
        send: () => {
          // ..
        },
      },
    );

    const newToken = await findTokenByTokenAddress(DRGTTokenAddress);
    const organizations = await Organization.createQueryBuilder('organization')
      .where(`organization.label = 'giveth' OR organization.label = 'trace'`)
      .getMany();
    assert.isOk(newToken);
    assert.isTrue(newToken!.organizations.length === organizations.length);
    assert.equal(newToken!.organizations[0].id, organizations[0].id);
  });
  it('should not create token when it is not unique by network and address', async () => {
    await createToken(
      {
        query: {},
        payload: {
          address: DRGTTokenAddress,
          decimals: 18,
          isGivbackEligible: true,
          mainnetAddress: '',
          name: 'DragonToken',
          networkId: 1,
          symbol: 'DRGT',
          organizations: 'giveth,trace',
        },
      },
      {
        send: () => {
          // ..
        },
      },
    );

    const tokensWithAddress = await Token.find({
      where: { address: DRGTTokenAddress },
    });
    assert.equal(tokensWithAddress.length, 1);
  });
}

function linkOrganizationsTestCases() {
  it('should overwrite token organizations relationships when present', async () => {
    const token = await Token.findOne({ where: { address: DRGTTokenAddress } });
    await linkOrganizations({
      query: {},
      record: {
        params: {
          id: token!.id,
          address: DRGTTokenAddress,
          decimals: 18,
          isGivbackEligible: true,
          mainnetAddress: '',
          name: 'DragonToken',
          networkId: 1,
          symbol: 'DRGT',
          organizations: ORGANIZATION_LABELS.ENDAOMENT,
        },
      },
    });

    const tokenUpdated = await findTokenByTokenAddress(DRGTTokenAddress);

    assert.isTrue(tokenUpdated!.organizations.length === 1);
    assert.equal(
      tokenUpdated!.organizations[0].label,
      ORGANIZATION_LABELS.ENDAOMENT,
    );
  });
}
