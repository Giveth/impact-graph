import { CustomHelpers, number, ObjectSchema, ValidationResult } from 'joi';
// tslint:disable-next-line:no-var-requires
const Joi = require('joi');
import { errorMessages } from '../errorMessages';
import { NETWORK_IDS } from '../../provider';
import { DONATION_STATUS } from '../../entities/donation';

const filterDateRegex = new RegExp('^[0-9]{8} [0-9]{2}:[0-9]{2}:[0-9]{2}$');

const ethereumWalletAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
const tokenSymbolRegex = /^[a-zA-Z]{3,10}$/;

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
  fromDate: Joi.string().pattern(filterDateRegex).messages({
    'string.base': errorMessages.INVALID_FROM_DATE,
    'string.pattern.base': errorMessages.INVALID_DATE_FORMAT,
  }),

  toDate: Joi.string().pattern(filterDateRegex).messages({
    'string.base': errorMessages.INVALID_TO_DATE,
    'string.pattern.base': errorMessages.INVALID_DATE_FORMAT,
  }),
});

export const createDonationQueryValidator = Joi.object({
  amount: Joi.number()?.greater(0).required(),
  transactionId: Joi.string().required().pattern(txHashRegex).messages({
    'string.pattern.base': errorMessages.INVALID_TRANSACTION_ID,
  }),
  transactionNetworkId: Joi.string()
    .required()
    .valid(...Object.values(NETWORK_IDS)),
  tokenAddress: Joi.string().pattern(ethereumWalletAddressRegex),
  token: Joi.string().required().pattern(tokenSymbolRegex).messages({
    'string.pattern.base': errorMessages.CURRENCY_IS_INVALID,
    'string.base': errorMessages.CURRENCY_IS_INVALID,
  }),
  projectId: Joi.number().integer().min(0).required(),
  nonce: Joi.number().integer().min(0).required(),
  anonymous: Joi.boolean(),
  transakId: Joi.string(),
});

export const updateDonationQueryValidator = Joi.object({
  donationId: Joi.number().integer().min(0).required(),
  status: Joi.string().valid(DONATION_STATUS.VERIFIED, DONATION_STATUS.FAILED),
});
