import { Token } from '../../../entities/token';
import { NETWORK_IDS } from '../../../provider';
import adminJs from 'adminjs';
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
  const organizationsList: {}[] = [];
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

  let message = `Token created successfully`;
  let type = 'success';
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
    message = e.message;
    type = 'danger';
  }

  return request;
};

export const createToken = async (
  request: AdminJsRequestInterface,
  response,
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
    networkId,
    symbol,
    organizations,
  } = request.payload;
  try {
    if (!address || !decimals || !name || !networkId || !symbol) {
      message = 'Please fill all required fields';
      type = 'danger';
      return {
        notice: {
          message,
          type,
        },
      };
    }
    const duplicateAddress = await Token.createQueryBuilder('token')
      .where('LOWER(token.address) = LOWER(:address)', { address })
      .andWhere('token.networkId = :networkId', {
        networkId: Number(networkId),
      })
      .getOne();

    const duplicateSymbol = await Token.createQueryBuilder('token')
      .where('LOWER(token.symbol) = LOWER(:symbol)', { symbol })
      .andWhere('token.networkId = :networkId', {
        networkId: Number(networkId),
      })
      .getOne();

    if (duplicateSymbol || duplicateAddress) {
      message = `Token ${
        duplicateAddress ? 'address' : 'symbol'
      } already exists!`;
      type = 'danger';
      return {
        record: {},
        notice: {
          message,
          type,
        },
      };
    }
    newToken = Token.create({
      name,
      symbol,
      address: address?.toLowerCase(),
      mainnetAddress: mainnetAddress?.toLowerCase(),
      isGivbackEligible,
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

  response.send({
    redirectUrl: '/admin/resources/Token',
    record: {},
    notice: {
      message,
      type,
    },
  });
  return {
    record: newToken,
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
            { value: NETWORK_IDS.CELO, label: 'CELO' },
            {
              value: NETWORK_IDS.CELO_ALFAJORES,
              label: 'ALFAJORES (Test CELO)',
            },
            { value: NETWORK_IDS.XDAI, label: 'XDAI' },
            { value: NETWORK_IDS.BSC, label: 'BSC' },
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
          handler: createToken,
          // component: false
        },
      },
    },
  };
};
