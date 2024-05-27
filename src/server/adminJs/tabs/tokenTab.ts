import adminJs from 'adminjs';
import { RecordJSON } from 'adminjs/src/frontend/interfaces/record-json.interface';
import { Token } from '../../../entities/token';
import { NETWORK_IDS } from '../../../provider';
import { canAccessTokenAction, ResourceActions } from '../adminJsPermissions';
import { AdminJsRequestInterface } from '../adminJs-types';
import { Organization } from '../../../entities/organization';
import { logger } from '../../../utils/logger';
import { findTokenByTokenId } from '../../../repositories/tokenRepository';

// generates orderly permutations and maps then into an array which is later flatten into 1 dimension
// Current length is the length of selected items from the total items
export const permute = (organizationsLabels: string[], currentLength) => {
  return organizationsLabels.flatMap((value, index) =>
    currentLength > 1
      ? permute(organizationsLabels.slice(index + 1), currentLength - 1).map(
          permutation => [value, ...permutation],
        )
      : [[value]],
  );
};

export const permuteOrganizations = (
  organizationsLabels: string[],
  organizationCount: number,
) => {
  let allPermutations: string[] = [];

  // we exclude from here the AllOrganizationsOption and length 1 selection
  for (
    let permutationLength = 2;
    permutationLength < organizationCount;
    permutationLength++
  ) {
    const permutations = permute(organizationsLabels, permutationLength);
    for (const permutation of permutations) {
      allPermutations = allPermutations.concat(permutation.join(','));
    }
  }

  return allPermutations
    .sort((a, b) => a.length - b.length)
    .map(labels => {
      return { value: labels, label: labels };
    });
};

export const generateOrganizationList = async () => {
  const organizationsList: NonNullable<unknown>[] = [];
  const [organizations, organizationCount] =
    await Organization.createQueryBuilder('organization')
      .orderBy('organization.id')
      .getManyAndCount();
  const organizationLabels = organizations.map(org => org.label);

  // all organization labels into 1 option
  const allOrganizations = {
    value: organizationLabels.join(','),
    label: 'All Organizations',
  };

  // all four organizations separated
  const individualOrganizations = organizations.map(org => {
    return { value: org.label, label: org.label };
  });

  const organizationsPermutations = permuteOrganizations(
    organizationLabels,
    organizationCount,
  );

  return organizationsList.concat(
    allOrganizations,
    individualOrganizations,
    organizationsPermutations,
  );
};

export const linkOrganizations = async (request: AdminJsRequestInterface) => {
  // edit action calls this method more than once, returning from those extra calls
  // default handler updates the other params, we only care about orgs
  if (!request.record.params.organizations) return request;

  const { organizations, id } = request.record.params;
  try {
    const token = await findTokenByTokenId(id);

    if (organizations) {
      // delete organization relation and relink them
      await Token.query(`
        DELETE FROM organization_tokens_token
        WHERE "tokenId" = ${token!.id}
      `);
      const organizationsInDb = await Organization.createQueryBuilder(
        'organization',
      )
        .where('organization.label IN (:...labels)', {
          labels: organizations.split(','),
        })
        .getMany();
      token!.organizations = organizationsInDb;
    }

    await token!.save();
  } catch (e) {
    logger.error('error creating token', e.message);
  }

  return request;
};

export const createToken = async (
  request: AdminJsRequestInterface,
  context,
) => {
  let message = `Token created successfully`;
  let type = 'success';
  let newToken;
  const {
    address,
    decimals,
    isGivbackEligible,
    mainnetAddress,
    name,
    coingeckoId,
    networkId,
    symbol,
    organizations,
  } = request.payload;
  try {
    newToken = Token.create({
      name,
      symbol,
      address: address?.toLowerCase(),
      mainnetAddress: mainnetAddress?.toLowerCase(),
      isGivbackEligible,
      coingeckoId,
      decimals: Number(decimals),
      networkId: Number(networkId),
    });

    if (organizations) {
      const organizationsInDb = await Organization.createQueryBuilder(
        'organization',
      )
        .where('organization.label IN (:...labels)', {
          labels: organizations.split(','),
        })
        .getMany();
      newToken.organizations = organizationsInDb;
    }

    await newToken.save();
  } catch (e) {
    logger.error('error creating token', e.message);
    message = e.message;
    type = 'danger';
  }

  const record: RecordJSON = {
    baseError: null,
    id: request?.params?.recordId || '',
    title: '',
    bulkActions: [],
    errors: {},
    params: (context as any)?.record?.params,
    populated: (context as any)?.record?.populated,
    recordActions: [],
  };

  return {
    redirectUrl: '/admin/resources/Token/actions/new',
    record,
    notice: {
      message,
      type,
    },
  };
};

export const generateTokenTab = async () => {
  return {
    resource: Token,
    options: {
      properties: {
        networkId: {
          isVisible: true,
          availableValues: [
            { value: NETWORK_IDS.MAIN_NET, label: 'MAINNET' },
            { value: NETWORK_IDS.ROPSTEN, label: 'ROPSTEN' },
            { value: NETWORK_IDS.GOERLI, label: 'GOERLI' },
            { value: NETWORK_IDS.POLYGON, label: 'POLYGON' },
            { value: NETWORK_IDS.OPTIMISTIC, label: 'OPTIMISTIC' },
            { value: NETWORK_IDS.OPTIMISM_SEPOLIA, label: 'OPTIMISM SEPOLIA' },
            { value: NETWORK_IDS.CELO, label: 'CELO' },
            {
              value: NETWORK_IDS.CELO_ALFAJORES,
              label: 'ALFAJORES (Test CELO)',
            },
            { value: NETWORK_IDS.ARBITRUM_MAINNET, label: 'ARBITRUM MAINNET' },
            { value: NETWORK_IDS.ARBITRUM_SEPOLIA, label: 'ARBITRUM SEPOLIA' },
            { value: NETWORK_IDS.BASE_MAINNET, label: 'BASE MAINNET' },
            { value: NETWORK_IDS.BASE_SEPOLIA, label: 'BASE SEPOLIA' },
            { value: NETWORK_IDS.XDAI, label: 'XDAI' },
            { value: NETWORK_IDS.BSC, label: 'BSC' },
            { value: NETWORK_IDS.ETC, label: 'Ethereum Classic' },
            {
              value: NETWORK_IDS.MORDOR_ETC_TESTNET,
              label: 'Ethereum Classic Testnet',
            },
          ],
        },
        symbol: { isVisible: true },
        name: { isVisible: true },
        isGivbackEligible: { isVisible: true },
        address: { isVisible: true },
        mainnetAddress: {
          isVisible: {
            show: true,
            edit: true,
            new: true,
            list: false,
            filter: true,
          },
        },
        coingeckoId: {
          isVisible: {
            show: true,
            edit: true,
            new: true,
            list: false,
            filter: true,
          },
        },
        cryptoCompareId: {
          isVisible: {
            show: true,
            edit: true,
            new: true,
            list: false,
            filter: true,
          },
        },
        decimals: { isVisible: true },
        organizations: {
          isVisible: {
            show: true,
            edit: true,
            new: true,
            list: true,
          },
          components: {
            show: adminJs.bundle('./components/ListOrganizationsNames'),
            list: adminJs.bundle('./components/ListOrganizationsNames'),
          },
          availableValues: await generateOrganizationList(),
        },
      },
      actions: {
        list: {
          isAccessible: ({ currentAdmin }) =>
            canAccessTokenAction({ currentAdmin }, ResourceActions.LIST),
        },
        show: {
          isAccessible: ({ currentAdmin }) =>
            canAccessTokenAction({ currentAdmin }, ResourceActions.SHOW),
        },
        bulkDelete: {
          isVisible: false,
          isAccessible: ({ currentAdmin }) =>
            canAccessTokenAction({ currentAdmin }, ResourceActions.BULK_DELETE),
        },
        // Organization is not editable, hooks are not working correctly
        edit: {
          before: async (request: AdminJsRequestInterface) => {
            Object.keys(request?.payload).forEach(key => {
              // because we made eager:true for token.organizations, if admin doesnt select organization
              // the front will send something like
              /**
               *
               'organizations.0.id': '1',
               'organizations.0.name': 'Giveth',
               'organizations.0.label': 'giveth',
               'organizations.0.website': 'https://giveth.io',
               'organizations.0.supportCustomTokens': 'true',
               */
              // in payload, and it make update query fail, so I delete all keys that starts with organizations.
              if (key.includes('organizations.')) {
                delete request?.payload[key];
              }
            });

            return request;
          },
          after: linkOrganizations,
          isAccessible: ({ currentAdmin }) =>
            canAccessTokenAction({ currentAdmin }, ResourceActions.EDIT),
          isVisible: true,
          // component: false
        },
        delete: {
          isVisible: true,
          isAccessible: ({ currentAdmin }) =>
            canAccessTokenAction({ currentAdmin }, ResourceActions.DELETE),
        },
        new: {
          isAccessible: ({ currentAdmin }) =>
            canAccessTokenAction({ currentAdmin }, ResourceActions.NEW),
          handler: async (req, _res, context) => createToken(req, context),
          // component: false,
        },
      },
    },
  };
};
