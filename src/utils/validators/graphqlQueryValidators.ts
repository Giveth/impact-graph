import { CustomHelpers, ObjectSchema, ValidationResult } from 'joi';
// tslint:disable-next-line:no-var-requires
const Joi = require('joi');
import { errorMessages } from '../errorMessages';

const filterDateRegex = new RegExp('^[0-9]{8} [0-9]{2}:[0-9]{2}:[0-9]{2}$');

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
