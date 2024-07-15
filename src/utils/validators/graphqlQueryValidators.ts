import Joi, { ObjectSchema, ValidationResult } from 'joi';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../errorMessages.js';
import { NETWORK_IDS } from '../../provider.js';
import { DONATION_STATUS } from '../../entities/donation.js';
import { PROJECT_VERIFICATION_STATUSES } from '../../entities/projectVerificationForm.js';
import { countriesList } from '../utils.js';
import { ChainType } from '../../types/network.js';

const filterDateRegex = new RegExp('^[0-9]{8} [0-9]{2}:[0-9]{2}:[0-9]{2}$');
const resourcePerDateRegex = new RegExp(
  '((?:19|20)\\d\\d)-(0?[1-9]|1[012])-([12][0-9]|3[01]|0?[1-9])',
);

const ethereumWalletAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const solanaWalletAddressRegex = /^[A-Za-z0-9]{43,44}$/;
const solanaProgramIdRegex =
  /^(11111111111111111111111111111111|[1-9A-HJ-NP-Za-km-z]{43,44})$/;
const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
const solanaTxRegex = /^[A-Za-z0-9]{86,88}$/; // TODO: Is this enough? We are using the signature to fetch transactions
// const tokenSymbolRegex = /^[a-zA-Z0-9]{2,10}$/; // OPTIMISTIC OP token is 2 chars long
// const tokenSymbolRegex = /^[a-zA-Z0-9]{2,10}$/;

export const validateWithJoiSchema = (data: any, schema: ObjectSchema) => {
  const validationResult = schema.validate(data);
  throwHttpErrorIfJoiValidatorFails(validationResult);
};

const throwHttpErrorIfJoiValidatorFails = (
  validationResult: ValidationResult,
) => {
  if (validationResult.error) {
    throw new Error(validationResult.error.details[0].message);
  }
};

export const getDonationsQueryValidator = Joi.object({
  fromDate: Joi.string()
    .pattern(filterDateRegex)
    .messages({
      'string.base': i18n.__(translationErrorMessagesKeys.INVALID_FROM_DATE),
      'string.pattern.base': i18n.__(
        translationErrorMessagesKeys.INVALID_DATE_FORMAT,
      ),
    }),

  toDate: Joi.string()
    .pattern(filterDateRegex)
    .messages({
      'string.base': i18n.__(translationErrorMessagesKeys.INVALID_TO_DATE),
      'string.pattern.base': i18n.__(
        translationErrorMessagesKeys.INVALID_DATE_FORMAT,
      ),
    }),
});

export const resourcePerDateReportValidator = Joi.object({
  fromDate: Joi.string()
    .allow(null, '')
    .pattern(resourcePerDateRegex)
    .messages({
      'string.base': errorMessages.INVALID_FROM_DATE,
      'string.pattern.base': errorMessages.INVALID_DATE_FORMAT,
    }),

  toDate: Joi.string().allow(null, '').pattern(resourcePerDateRegex).messages({
    'string.base': errorMessages.INVALID_TO_DATE,
    'string.pattern.base': errorMessages.INVALID_DATE_FORMAT,
  }),
});

export const createDonationQueryValidator = Joi.object({
  amount: Joi.number()?.greater(0).required(),
  transactionId: Joi.when('safeTransactionId', {
    is: Joi.any().empty(),
    then: Joi.alternatives().try(
      Joi.string().required().pattern(txHashRegex, 'EVM transaction IDs'),
      Joi.string().required().pattern(solanaTxRegex, 'Solana Transaction ID'),
    ),
    otherwise: Joi.string()
      .allow(null, '')
      .pattern(txHashRegex, 'EVM transaction IDs')
      .messages({
        'string.pattern.base': i18n.__(
          translationErrorMessagesKeys.INVALID_TRANSACTION_ID,
        ),
      }),
  }),
  transactionNetworkId: Joi.number()
    .required()
    .valid(...Object.values(NETWORK_IDS)),
  tokenAddress: Joi.when('chainType', {
    is: ChainType.SOLANA,
    then: Joi.string().pattern(solanaProgramIdRegex),
    otherwise: Joi.string().pattern(ethereumWalletAddressRegex),
  }).messages({
    'string.pattern.base': i18n.__(
      translationErrorMessagesKeys.INVALID_TOKEN_ADDRESS,
    ),
    'string.disallow': i18n.__(
      translationErrorMessagesKeys.INVALID_TOKEN_ADDRESS,
    ),
  }),
  token: Joi.string().required(),
  // .pattern(tokenSymbolRegex)
  // .messages({
  //   'string.pattern.base': i18n.__(
  //     translationErrorMessagesKeys.CURRENCY_IS_INVALID,
  //   ),
  //   'string.base': i18n.__(translationErrorMessagesKeys.CURRENCY_IS_INVALID), }),
  projectId: Joi.number().integer().min(0).required(),
  nonce: Joi.number().integer().min(0).allow(null),
  anonymous: Joi.boolean(),
  transakId: Joi.string()?.allow(null, ''),
  referrerId: Joi.string().allow(null, ''),
  safeTransactionId: Joi.string().allow(null, ''),
  chainType: Joi.string().required(),
});

export const createDraftDonationQueryValidator = Joi.object({
  amount: Joi.number()?.greater(0).required(),
  networkId: Joi.number()
    .required()
    .valid(...Object.values(NETWORK_IDS)),
  tokenAddress: Joi.when('chainType', {
    is: ChainType.SOLANA,
    then: Joi.string().pattern(solanaProgramIdRegex),
    otherwise: Joi.string().pattern(ethereumWalletAddressRegex),
  }).messages({
    'string.pattern.base': i18n.__(
      translationErrorMessagesKeys.INVALID_TOKEN_ADDRESS,
    ),
    'string.disallow': i18n.__(
      translationErrorMessagesKeys.INVALID_TOKEN_ADDRESS,
    ),
  }),
  token: Joi.string().required(),
  projectId: Joi.number().integer().min(0).required(),
  anonymous: Joi.boolean(),
  referrerId: Joi.string().allow(null, ''),
  safeTransactionId: Joi.string().allow(null, ''),
  chainType: Joi.string().required(),
});

export const createDraftRecurringDonationQueryValidator = Joi.object({
  networkId: Joi.number()
    .required()
    .valid(...Object.values(NETWORK_IDS)),
  currency: Joi.string().required(),
  flowRate: Joi.string().required(),
  projectId: Joi.number().integer().min(0).required(),
  recurringDonationId: Joi.number().integer(),
  anonymous: Joi.boolean(),
  isBatch: Joi.boolean(),
  isForUpdate: Joi.boolean(),
  chainType: Joi.string().required(),
});

export const updateDonationQueryValidator = Joi.object({
  donationId: Joi.number().integer().min(0).required(),
  status: Joi.string().valid(DONATION_STATUS.VERIFIED, DONATION_STATUS.FAILED),
});

export const getRecurringDonationStatsArgsValidator = Joi.object({
  beginDate: Joi.string().pattern(resourcePerDateRegex).messages({
    'string.base': errorMessages.INVALID_FROM_DATE,
    'string.pattern.base': errorMessages.INVALID_DATE_FORMAT,
  }),
  endDate: Joi.string().pattern(resourcePerDateRegex).messages({
    'string.base': errorMessages.INVALID_FROM_DATE,
    'string.pattern.base': errorMessages.INVALID_DATE_FORMAT,
  }),
});

export const createProjectVerificationRequestValidator = Joi.object({
  slug: Joi.string().required(),
});

export const getCurrentProjectVerificationRequestValidator = Joi.object({
  slug: Joi.string().required(),
});

const projectPersonalInfoValidator = Joi.object({
  fullName: Joi.string(),
  walletAddress: Joi.string(),
  email: Joi.string(),
});

const projectRegistryValidator = Joi.object({
  isNonProfitOrganization: Joi.boolean(),
  organizationCountry: Joi.string().valid(
    // We allow country to be empty string
    '',
    ...countriesList.map(({ name }) => name),
  ),
  organizationWebsite: Joi.string().allow(''),
  organizationDescription: Joi.string().allow(''),
  organizationName: Joi.string().allow(''),
  attachments: Joi.array()?.items(Joi.string()).max(5),
});

const projectContactsValidator = Joi.array().items(
  Joi.object({
    name: Joi.string().required(),
    url: Joi.string().required(),
  }),
);

const milestonesValidator = Joi.object({
  foundationDate: Joi.date().allow(''),
  mission: Joi.string().allow(''),
  achievedMilestones: Joi.string().allow(''),
  achievedMilestonesProofs: Joi.array()?.items(Joi.string()).max(5),
  problem: Joi.string().allow(''),
  plans: Joi.string().allow(''),
  impact: Joi.string().allow(''),
});

const managingFundsValidator = Joi.object({
  description: Joi.string().required(),
  relatedAddresses: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      address: Joi.alternatives().try(
        Joi.string().required().pattern(ethereumWalletAddressRegex),
        Joi.string().required().pattern(solanaWalletAddressRegex),
      ),
      networkId: Joi.number()?.valid(
        0, // frontend may send 0 as a network id for solana, so we should allow it
        NETWORK_IDS.SOLANA_MAINNET, // Solana
        NETWORK_IDS.SOLANA_DEVNET, // Solana
        NETWORK_IDS.SOLANA_TESTNET, // Solana
        NETWORK_IDS.MAIN_NET,
        NETWORK_IDS.ROPSTEN,
        NETWORK_IDS.GOERLI,
        NETWORK_IDS.POLYGON,
        NETWORK_IDS.CELO,
        NETWORK_IDS.CELO_ALFAJORES,
        NETWORK_IDS.ARBITRUM_MAINNET,
        NETWORK_IDS.ARBITRUM_SEPOLIA,
        NETWORK_IDS.BASE_MAINNET,
        NETWORK_IDS.BASE_SEPOLIA,
        NETWORK_IDS.ZKEVM_MAINNET,
        NETWORK_IDS.ZKEVM_CARDONA,
        NETWORK_IDS.OPTIMISTIC,
        NETWORK_IDS.OPTIMISM_SEPOLIA,
        NETWORK_IDS.XDAI,
        NETWORK_IDS.ETC,
        NETWORK_IDS.MORDOR_ETC_TESTNET,
      ),
      chainType: Joi.string()
        .valid(ChainType.EVM, ChainType.SOLANA)
        .default(ChainType.EVM),
    }),
  ),
});

export const updateProjectVerificationProjectPersonalInfoStepValidator =
  Joi.object({
    personalInfo: projectPersonalInfoValidator,
  });

export const updateProjectVerificationProjectContactsStepValidator = Joi.object(
  {
    projectContacts: projectContactsValidator,
  },
);

export const updateProjectVerificationProjectRegistryStepValidator = Joi.object(
  {
    projectRegistry: projectRegistryValidator,
  },
);

export const updateProjectVerificationManagingFundsStepValidator = Joi.object({
  managingFunds: managingFundsValidator,
});

export const updateProjectVerificationMilestonesStepValidator = Joi.object({
  milestones: milestonesValidator,
});

export const updateProjectVerificationTermsAndConditionsStepValidator =
  Joi.object({
    isTermAndConditionsAccepted: Joi.boolean().required(),
  });

export const submitProjectVerificationStepValidator = Joi.object({
  isTermAndConditionsAccepted: Joi.boolean().required().valid(true),
  socialProfiles: Joi.array().required().min(0),
  // socialProfiles: Joi.array().required().min(1).messages({
  //   'string.base':
  //     i18n.__(translationErrorMessagesKeys.SHOULD_HAVE_AT_LEAST_ONE_CONNECTED_SOCIAL_NETWORK_BEFORE_SUBMIT),
  // }),
  status: Joi.string().required().valid(PROJECT_VERIFICATION_STATUSES.DRAFT),
  emailConfirmed: Joi.boolean().required().valid(true),
  projectContacts: projectContactsValidator,
  milestones: milestonesValidator,
  managingFunds: managingFundsValidator,
  projectRegistry: projectRegistryValidator,
  personalInfo: projectPersonalInfoValidator,
});
