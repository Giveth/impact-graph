import path from 'path';
import _i18n from 'i18n';

export const i18n = _i18n;

// global config, where ever its exported
i18n.configure({
  locales: ['en', 'es'],
  directory: path.join(__dirname, 'locales'),
  defaultLocale: 'en',
  header: 'accept-language',
});

// sets the language for a request in app.use express
export const setI18nLocaleForRequest = async (req, _res, next) => {
  const language = req.headers['accept-language'] || 'en';
  i18n.setLocale(language);
  next();
};

export const errorMessages = {
  FIAT_DONATION_ALREADY_EXISTS: 'Onramper donation already exists',
  CAMPAIGN_NOT_FOUND: 'Campaign not found',
  QF_ROUND_NOT_FOUND: 'qf round not found',
  NONE_OF_WALLET_ADDRESSES_FOUND_IN_DB:
    'None of the wallet addresses were found in the database',
  NO_VALID_PROJECTS_FOUND: 'No valid project slug found in the CSV',
  THERE_IS_NOT_ANY_FEATURED_CAMPAIGN: 'There is not any featured campaign',
  CHAINVINE_REFERRER_NOT_FOUND: 'Chainvine referrer not found',
  ONRAMPER_SIGNATURE_INVALID: 'Onramper signature invalid',
  ONRAMPER_SIGNATURE_MISSING: 'Onramper signature missing',
  UPLOAD_FAILED: 'Upload file failed',
  SPECIFY_GIV_POWER_ADAPTER: 'Specify givPower adapter',
  CHANGE_API_INVALID_TITLE_OR_EIN:
    'ChangeAPI title or EIN not found or invalid',
  INVALID_SOCIAL_NETWORK: 'Invalid social network',
  IT_SHOULD_HAVE_ONE_OR_TWO_ADDRESSES_FOR_RECIPIENT:
    'It should have one or two wallet recipient addresses',
  NOT_IMPLEMENTED: 'Not implemented',
  SHOULD_SEND_AT_LEAST_ONE_OF_PROJECT_ID_AND_USER_ID:
    'Should send at least on of userId or projectId',
  YOU_JUST_CAN_VERIFY_REJECTED_AND_SUBMITTED_FORMS:
    'You just can verify rejected and submitted forms',
  YOU_JUST_CAN_MAKE_DRAFT_REJECTED_AND_SUBMITTED_FORMS:
    'You just can make draft rejected and submitted forms',
  YOU_JUST_CAN_REJECT_SUBMITTED_FORMS: 'You just can reject submitted forms',
  INVALID_TRACK_ID_FOR_OAUTH2_LOGIN: 'Invalid trackId for oauth2 login',
  SOCIAL_NETWORK_IS_DIFFERENT_WITH_CLAIMED_ONE:
    'Social network is different with claimed one',
  SOCIAL_PROFILE_NOT_FOUND: 'Social profile not gound',
  CHANGE_API_TITLE_OR_EIN_NOT_PRECISE:
    'Please query the exact project title or EIN ID from the ChangeAPI site',
  YOU_ARE_NOT_OWNER_OF_THIS_DONATION: 'You are not owner of this donation',
  NOT_SUPPORTED_THIRD_PARTY_API: 'Third Party API not supported',
  IPFS_IMAGE_UPLOAD_FAILED: 'Image upload failed',
  YOU_SHOULD_FILL_EMAIL_PERSONAL_INFO_BEFORE_CONFIRMING_EMAIL:
    'You should fill email in personal info step before confirming it',
  YOU_ALREADY_VERIFIED_THIS_EMAIL: 'You already verified this email',
  INVALID_FROM_DATE: 'Invalid fromDate',
  INVALID_TO_DATE: 'Invalid toDate',
  VERIFIED_USERNAME_IS_DIFFERENT_WITH_CLAIMED_ONE:
    'Username is not the claimed one',
  INVALID_AUTHORIZATION_VERSION: 'Authorization version is not valid',
  INVALID_STEP: 'Invalid step',
  DONOR_REPORTED_IT_AS_FAILED: 'Donor reported it as failed',
  INVALID_DATE_FORMAT: 'Date format should be YYYYMMDD HH:mm:ss',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  ERROR_CONNECTING_DB: 'Error in connecting DB',
  YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT:
    'You dont have access to view this project',
  JUST_ACTIVE_PROJECTS_ACCEPT_DONATION: 'Just active projects accept donation',
  CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE:
    'Please select no more than 5 categories',
  CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION:
    'This category is not valid',
  INVALID_TX_HASH: 'Invalid txHash',
  INVALID_TRANSACTION_ID: 'Invalid transactionId',
  INVALID_TOKEN_ADDRESS: 'Invalid tokenAddress',
  DUPLICATE_TX_HASH: 'There is a donation with this txHash in our DB',
  YOU_ARE_NOT_THE_OWNER_OF_PROJECT: 'You are not the owner of this project.',
  YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM:
    'You are not the owner of this project verification form.',
  YOU_ARE_NOT_THE_OWNER_OF_SOCIAL_PROFILE:
    'You are not the owner of this social profile project verification form.',
  PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_MODIFY_SOCIAL_PROFILES:
    'project verification form is not draft, so you cant modify social profiles',
  YOU_ALREADY_ADDED_THIS_SOCIAL_PROFILE_FOR_THIS_VERIFICATION_FORM:
    'You already have added this social profile for this verification form',
  PROJECT_VERIFICATION_FORM_NOT_FOUND: 'Project verification form not found',
  PROJECT_IS_ALREADY_VERIFIED: 'Project is already verified.',
  YOU_JUST_CAN_EDIT_DRAFT_REQUESTS: 'Project is already verified.',
  EMAIL_CONFIRMATION_CANNOT_BE_SENT_IN_THIS_STEP:
    'Email confirmation cannot be sent in this step',
  THERE_IS_AN_ONGOING_VERIFICATION_REQUEST_FOR_THIS_PROJECT:
    'There is an ongoing project verification request for this project',
  THERE_IS_NOT_ANY_ONGOING_PROJECT_VERIFICATION_FORM_FOR_THIS_PROJECT:
    'There is not any project verification form for this project',
  PROJECT_STATUS_NOT_FOUND:
    'No project status found, this should be impossible',
  YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT:
    'You dont have access to deactivate this project',
  PROJECT_NOT_FOUND: 'Project not found.',
  THERE_IS_AN_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT:
    'There is already an anchor address for this project',
  THERE_IS_NOT_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT:
    'There is not anchor address for this project',
  PROJECT_DOESNT_HAVE_ANY_ADDRESS_ON_THIS_NETWORK_FOR_RECURRING_DONATION:
    'Project doesnt have any address on this network for recurring donation',
  PROJECT_DOESNT_HAVE_RECIPIENT_ADDRESS_ON_THIS_NETWORK:
    'Project doesnt have recipient address on this network',
  PROJECT_IS_NOT_ACTIVE: 'Project is not active.',
  RECURRING_DONATION_NOT_FOUND: 'Recurring donation not found.',
  INVALID_FUNCTION: 'Invalid function name of transaction',
  PROJECT_UPDATE_NOT_FOUND: 'Project update not found.',
  DONATION_NOT_FOUND: 'donation not found',
  THIS_PROJECT_IS_CANCELLED_OR_DEACTIVATED_ALREADY:
    'This project has been cancelled by an Admin for inappropriate content or a violation of the Terms of Use',
  DONATION_VIEWING_LOGIN_REQUIRED:
    'You must be signed-in in order to register project donations',
  TRANSACTION_NOT_FOUND: 'Transaction not found.',
  TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS:
    'FromAddress of Transaction is different from sent fromAddress',
  TRANSACTION_STATUS_IS_FAILED_IN_NETWORK:
    'Transaction status is failed in network',
  INVALID_VERIFICATION_REVOKE_STATUS: 'Invalid revoke status updated',
  TRANSACTION_NOT_FOUND_AND_NONCE_IS_USED:
    'Transaction not found and nonce is used',
  TRANSACTION_AMOUNT_IS_DIFFERENT_WITH_SENT_AMOUNT:
    'Transaction amount is different with sent amount',
  TRANSACTION_CANT_BE_OLDER_THAN_DONATION:
    'Transaction can not be older than donation',
  TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS:
    'ToAddress of Transaction is different to sent toAddress',
  TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY:
    'Smart contract address is not equal to transaction.to',
  USER_NOT_FOUND: 'User not found.',
  SYBIL_RECORD_IS_IN_DB_ALREADY:
    'Sybil item for this user and qfRound is in the DB already.',
  INVALID_NETWORK_ID: 'Network Id is invalid',
  INVALID_TOKEN_SYMBOL: 'Token symbol is invalid',
  TOKEN_SYMBOL_IS_REQUIRED: 'Token symbol is required',
  TOKEN_NOT_FOUND: 'Token Not found',
  TRANSACTION_NOT_FOUNT_IN_USER_HISTORY:
    'TRANSACTION_NOT_FOUNT_IN_USER_HISTORY',
  TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY:
    'Transaction with this nonce is not mined already',
  TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS:
    'toAddress of donation should be equal to project wallet address',
  INVALID_WALLET_ADDRESS: 'Address not valid',
  INVALID_EMAIL: 'Email not valid',
  UN_AUTHORIZED: 'unAuthorized',
  DONOR_USER_NOT_FOUND: 'DONOR_USER_NOT_FOUND',
  BOTH_FIRST_NAME_AND_LAST_NAME_CANT_BE_EMPTY:
    'Both firstName and lastName cant be empty',
  FIRSTNAME_CANT_BE_EMPTY_STRING: 'firstName cant be empty string',
  LASTNAME_CANT_BE_EMPTY_STRING: 'lastName cant be empty string',
  PROJECT_WITH_THIS_TITLE_EXISTS:
    'There is a project with this title, please use another title',
  INVALID_PROJECT_TITLE:
    'Your project name isnt valid, please only use letters and numbers',
  ACCESS_DENIED: 'Access denied',
  AUTHENTICATION_REQUIRED: 'Authentication required.',
  SOMETHING_WENT_WRONG: 'Something went wrong.',
  PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN: 'Project doesnt support this token',
  THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT:
    'There is no recipient address for this project and networkId',
  AMOUNT_IS_INVALID: 'Amount is not valid',
  CURRENCY_IS_INVALID: 'Currency is not valid',
  SHOULD_HAVE_AT_LEAST_ONE_CONNECTED_SOCIAL_NETWORK_BEFORE_SUBMIT:
    'Should have one connected social network before submit',
  SOCIAL_PROFILE_IS_ALREADY_VERIFIED: 'Social profile is already verified',
  YOU_ARE_NOT_THE_OWNER_OF_THIS_SOCIAL_PROFILE:
    'You are not the owner of social profile',
  ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE:
    'Error in getting accessToken by authorization code',
  ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT:
    'First project boosting value must be 100%',
  ERROR_GIVPOWER_BOOSTING_INVALID_DATA: 'Invalid data',
  ERROR_GIV_POWER_BOOSTING_SUM_IS_GREATER_THAN_MAXIMUM:
    'Giv power boosting summation is greater than 100',
  // ERROR_GIVPOWER_BOOSTING_PERCENTAGE_INVALID_RANGE: 'Invalid percentage value',
  // ERROR_GIVPOWER_BOOSTING_MULTI_PERCENTAGE_INVALID_SUM:
  //   'Sum of all boosting percentages must be between 99% to 100%',
  // ERROR_GIVPOWER_BOOSTING_MULTISET_INVALID_DATA_LENGTH:
  //   'Length of passed projects and percentages should be the same and more than zero',
  ERROR_GIVPOWER_BOOSTING_MAX_PROJECT_LIMIT:
    'Number of boosted projects exceeds limit',
  REGISTERED_NON_PROFITS_CATEGORY_DOESNT_EXIST:
    'There is not any category with name registered-non-profits, probably you forgot to run migrations',
  TEXT_IS_REQUIRED: '"text" is required',
  YOU_SHOULD_FILL_EITHER_BOTH_LINK_AND_LINK_TITLE_OR_NONE:
    'You should fille both link and linkTitle or dont fill none of them',
  PROJECT_DESCRIPTION_LENGTH_SIZE_EXCEEDED:
    'Project description length size exceeded',
  CHAINVINE_REGISTRATION_ERROR: 'Chainvine ID failed to be generated',
  CHAINVINE_CLICK_EVENT_ERROR: 'Unable to register click event or link donor',
  GITCOIN_ERROR_FETCHING_DATA: 'Unable to fetch gitcoin data, check logs',
  TX_NOT_FOUND: 'Transaction not found',
  INVALID_PROJECT_ID: 'Invalid project id',
  INVALID_PROJECT_OWNER: 'Project owner is invalid',
  PROJECT_DOESNT_ACCEPT_RECURRING_DONATION:
    'Project does not accept recurring donation',
};

export const translationErrorMessagesKeys = {
  GITCOIN_ERROR_FETCHING_DATA: 'GITCOIN_ERROR_FETCHING_DATA',
  TX_NOT_FOUND: 'TX_NOT_FOUND',
  INVALID_PROJECT_ID: 'INVALID_PROJECT_ID',
  INVALID_PROJECT_OWNER: 'INVALID_PROJECT_OWNER',
  CHAINVINE_CLICK_EVENT_ERROR: 'CHAINVINE_CLICK_EVENT_ERROR',
  CHAINVINE_REGISTRATION_ERROR: 'CHAINVINE_REGISTRATION_ERROR',
  FIAT_DONATION_ALREADY_EXISTS: 'FIAT_DONATION_ALREADY_EXISTS',
  ONRAMPER_SIGNATURE_INVALID: 'ONRAMPER_SIGNATURE_INVALID',
  ONRAMPER_SIGNATURE_MISSING: 'ONRAMPER_SIGNATURE_MISSING',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  SPECIFY_GIV_POWER_ADAPTER: 'SPECIFY_GIV_POWER_ADAPTER',
  CHANGE_API_INVALID_TITLE_OR_EIN: 'SPECIFY_GIV_POWER_ADAPTER',
  INVALID_SOCIAL_NETWORK: 'INVALID_SOCIAL_NETWORK',
  RECIPIENT_ADDRESSES_CANT_BE_EMPTY: 'RECIPIENT_ADDRESSES_CANT_BE_EMPTY',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SHOULD_SEND_AT_LEAST_ONE_OF_PROJECT_ID_AND_USER_ID:
    'SHOULD_SEND_AT_LEAST_ONE_OF_PROJECT_ID_AND_USER_ID',
  YOU_JUST_CAN_VERIFY_REJECTED_AND_SUBMITTED_FORMS:
    'YOU_JUST_CAN_VERIFY_REJECTED_AND_SUBMITTED_FORMS',
  YOU_JUST_CAN_MAKE_DRAFT_REJECTED_AND_SUBMITTED_FORMS:
    'YOU_JUST_CAN_MAKE_DRAFT_REJECTED_AND_SUBMITTED_FORMS',
  YOU_JUST_CAN_REJECT_SUBMITTED_FORMS: 'YOU_JUST_CAN_REJECT_SUBMITTED_FORMS',
  INVALID_TRACK_ID_FOR_OAUTH2_LOGIN: 'INVALID_TRACK_ID_FOR_OAUTH2_LOGIN',
  SOCIAL_NETWORK_IS_DIFFERENT_WITH_CLAIMED_ONE:
    'SOCIAL_NETWORK_IS_DIFFERENT_WITH_CLAIMED_ONE',
  SOCIAL_PROFILE_NOT_FOUND: 'SOCIAL_PROFILE_NOT_FOUND',
  CHANGE_API_TITLE_OR_EIN_NOT_PRECISE: 'CHANGE_API_TITLE_OR_EIN_NOT_PRECISE',
  YOU_ARE_NOT_OWNER_OF_THIS_DONATION: 'YOU_ARE_NOT_OWNER_OF_THIS_DONATION',
  NOT_SUPPORTED_THIRD_PARTY_API: 'NOT_SUPPORTED_THIRD_PARTY_API',
  IPFS_IMAGE_UPLOAD_FAILED: 'IPFS_IMAGE_UPLOAD_FAILED',
  YOU_SHOULD_FILL_EMAIL_PERSONAL_INFO_BEFORE_CONFIRMING_EMAIL:
    'YOU_SHOULD_FILL_EMAIL_PERSONAL_INFO_BEFORE_CONFIRMING_EMAIL',
  YOU_ALREADY_VERIFIED_THIS_EMAIL: 'YOU_ALREADY_VERIFIED_THIS_EMAIL',
  INVALID_FROM_DATE: 'INVALID_FROM_DATE',
  INVALID_TO_DATE: 'INVALID_TO_DATE',
  VERIFIED_USERNAME_IS_DIFFERENT_WITH_CLAIMED_ONE:
    'VERIFIED_USERNAME_IS_DIFFERENT_WITH_CLAIMED_ONE',
  INVALID_AUTHORIZATION_VERSION: 'INVALID_AUTHORIZATION_VERSION',
  INVALID_STEP: 'INVALID_STEP',
  DONOR_REPORTED_IT_AS_FAILED: 'DONOR_REPORTED_IT_AS_FAILED',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  ERROR_CONNECTING_DB: 'ERROR_CONNECTING_DB',
  YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT:
    'YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT',
  JUST_ACTIVE_PROJECTS_ACCEPT_DONATION: 'JUST_ACTIVE_PROJECTS_ACCEPT_DONATION',
  CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE:
    'CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE',
  CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION:
    'CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION',
  INVALID_TX_HASH: 'INVALID_TX_HASH',
  INVALID_TRANSACTION_ID: 'INVALID_TRANSACTION_ID',
  INVALID_TOKEN_ADDRESS: 'INVALID_TOKEN_ADDRESS',
  DUPLICATE_TX_HASH: 'DUPLICATE_TX_HASH',
  YOU_ARE_NOT_THE_OWNER_OF_PROJECT: 'YOU_ARE_NOT_THE_OWNER_OF_PROJECT',
  YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM:
    'YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM',
  YOU_ARE_NOT_THE_OWNER_OF_SOCIAL_PROFILE:
    'YOU_ARE_NOT_THE_OWNER_OF_SOCIAL_PROFILE',
  PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_MODIFY_SOCIAL_PROFILES:
    'PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_MODIFY_SOCIAL_PROFILES',
  YOU_ALREADY_ADDED_THIS_SOCIAL_PROFILE_FOR_THIS_VERIFICATION_FORM:
    'YOU_ALREADY_ADDED_THIS_SOCIAL_PROFILE_FOR_THIS_VERIFICATION_FORM',
  PROJECT_VERIFICATION_FORM_NOT_FOUND: 'PROJECT_VERIFICATION_FORM_NOT_FOUND',
  PROJECT_IS_ALREADY_VERIFIED: 'PROJECT_IS_ALREADY_VERIFIED',
  YOU_JUST_CAN_EDIT_DRAFT_REQUESTS: 'YOU_JUST_CAN_EDIT_DRAFT_REQUESTS',
  EMAIL_CONFIRMATION_CANNOT_BE_SENT_IN_THIS_STEP:
    'EMAIL_CONFIRMATION_CANNOT_BE_SENT_IN_THIS_STEP',
  THERE_IS_AN_ONGOING_VERIFICATION_REQUEST_FOR_THIS_PROJECT:
    'THERE_IS_AN_ONGOING_VERIFICATION_REQUEST_FOR_THIS_PROJECT',
  THERE_IS_NOT_ANY_ONGOING_PROJECT_VERIFICATION_FORM_FOR_THIS_PROJECT:
    'THERE_IS_NOT_ANY_ONGOING_PROJECT_VERIFICATION_FORM_FOR_THIS_PROJECT',
  PROJECT_STATUS_NOT_FOUND: 'PROJECT_STATUS_NOT_FOUND',
  YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT:
    'YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  PROJECT_DOESNT_ACCEPT_RECURRING_DONATION:
    'Project does not accept recurring donation',
  RECURRING_DONATION_NOT_FOUND: 'Recurring donation not found.',
  PROJECT_DOESNT_HAVE_RECIPIENT_ADDRESS_ON_THIS_NETWORK:
    'Project doesnt have recipient address on this network',
  THERE_IS_AN_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT:
    'There is already an anchor address for this project',
  THERE_IS_NOT_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT:
    'There is not anchor address for this project',
  PROJECT_DOESNT_HAVE_ANY_ADDRESS_ON_THIS_NETWORK_FOR_RECURRING_DONATION:
    'Project doesnt have any address on this network for recurring donation',
  PROJECT_IS_NOT_ACTIVE: 'PROJECT_IS_NOT_ACTIVE',
  INVALID_FUNCTION: 'INVALID_FUNCTION',
  PROJECT_UPDATE_NOT_FOUND: 'PROJECT_UPDATE_NOT_FOUND',
  DONATION_NOT_FOUND: 'DONATION_NOT_FOUND',
  THIS_PROJECT_IS_CANCELLED_OR_DEACTIVATED_ALREADY:
    'THIS_PROJECT_IS_CANCELLED_OR_DEACTIVATED_ALREADY',
  DONATION_VIEWING_LOGIN_REQUIRED: 'DONATION_VIEWING_LOGIN_REQUIRED',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS:
    'TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS',
  TRANSACTION_STATUS_IS_FAILED_IN_NETWORK:
    'TRANSACTION_STATUS_IS_FAILED_IN_NETWORK',
  INVALID_VERIFICATION_REVOKE_STATUS: 'INVALID_VERIFICATION_REVOKE_STATUS',
  TRANSACTION_NOT_FOUND_AND_NONCE_IS_USED:
    'TRANSACTION_NOT_FOUND_AND_NONCE_IS_USED',
  TRANSACTION_AMOUNT_IS_DIFFERENT_WITH_SENT_AMOUNT:
    'TRANSACTION_AMOUNT_IS_DIFFERENT_WITH_SENT_AMOUNT',
  TRANSACTION_CANT_BE_OLDER_THAN_DONATION:
    'TRANSACTION_CANT_BE_OLDER_THAN_DONATION',
  TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS:
    'TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS',
  TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY:
    'TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_NETWORK_ID: 'INVALID_NETWORK_ID',
  INVALID_TOKEN_SYMBOL: 'INVALID_TOKEN_SYMBOL',
  TOKEN_SYMBOL_IS_REQUIRED: 'TOKEN_SYMBOL_IS_REQUIRED',
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  TRANSACTION_NOT_FOUNT_IN_USER_HISTORY:
    'TRANSACTION_NOT_FOUNT_IN_USER_HISTORY',
  TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY:
    'TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY',
  TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS:
    'TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS',
  INVALID_WALLET_ADDRESS: 'INVALID_WALLET_ADDRESS',
  INVALID_EMAIL: 'INVALID_EMAIL',
  UN_AUTHORIZED: 'UN_AUTHORIZED',
  DONOR_USER_NOT_FOUND: 'DONOR_USER_NOT_FOUND',
  BOTH_FIRST_NAME_AND_LAST_NAME_CANT_BE_EMPTY:
    'BOTH_FIRST_NAME_AND_LAST_NAME_CANT_BE_EMPTY',
  FIRSTNAME_CANT_BE_EMPTY_STRING: 'FIRSTNAME_CANT_BE_EMPTY_STRING',
  LASTNAME_CANT_BE_EMPTY_STRING: 'LASTNAME_CANT_BE_EMPTY_STRING',
  PROJECT_WITH_THIS_TITLE_EXISTS: 'PROJECT_WITH_THIS_TITLE_EXISTS',
  INVALID_PROJECT_TITLE: 'INVALID_PROJECT_TITLE',
  ACCESS_DENIED: 'ACCESS_DENIED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  SOMETHING_WENT_WRONG: 'SOMETHING_WENT_WRONG',
  PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN: 'PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN',
  THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT:
    'THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT',
  AMOUNT_IS_INVALID: 'AMOUNT_IS_INVALID',
  CURRENCY_IS_INVALID: 'CURRENCY_IS_INVALID',
  SHOULD_HAVE_AT_LEAST_ONE_CONNECTED_SOCIAL_NETWORK_BEFORE_SUBMIT:
    'SHOULD_HAVE_AT_LEAST_ONE_CONNECTED_SOCIAL_NETWORK_BEFORE_SUBMIT',
  SOCIAL_PROFILE_IS_ALREADY_VERIFIED: 'SOCIAL_PROFILE_IS_ALREADY_VERIFIED',
  YOU_ARE_NOT_THE_OWNER_OF_THIS_SOCIAL_PROFILE:
    'YOU_ARE_NOT_THE_OWNER_OF_THIS_SOCIAL_PROFILE',
  ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE:
    'ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE',
  ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT:
    'ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT',
  ERROR_GIVPOWER_BOOSTING_INVALID_DATA: 'ERROR_GIVPOWER_BOOSTING_INVALID_DATA',
  ERROR_GIV_POWER_BOOSTING_SUM_IS_GREATER_THAN_MAXIMUM:
    'ERROR_GIV_POWER_BOOSTING_SUM_IS_GREATER_THAN_MAXIMUM',
  // ERROR_GIVPOWER_BOOSTING_PERCENTAGE_INVALID_RANGE: 'Invalid percentage value',
  // ERROR_GIVPOWER_BOOSTING_MULTI_PERCENTAGE_INVALID_SUM:
  //   'Sum of all boosting percentages must be between 99% to 100%',
  // ERROR_GIVPOWER_BOOSTING_MULTISET_INVALID_DATA_LENGTH:
  //   'Length of passed projects and percentages should be the same and more than zero',
  ERROR_GIVPOWER_BOOSTING_MAX_PROJECT_LIMIT:
    'ERROR_GIVPOWER_BOOSTING_MAX_PROJECT_LIMIT',
  REGISTERED_NON_PROFITS_CATEGORY_DOESNT_EXIST:
    'REGISTERED_NON_PROFITS_CATEGORY_DOESNT_EXIST',
  PROJECT_UPDATE_CONTENT_LENGTH_SIZE_EXCEEDED:
    'PROJECT_UPDATE_CONTENT_LENGTH_SIZE_EXCEEDED',
  DRAFT_DONATION_DISABLED: 'DRAFT_DONATION_DISABLED',
  DRAFT_RECURRING_DONATION_DISABLED: 'DRAFT_RECURRING_DONATION_DISABLED',
  EVM_SUPPORT_ONLY: 'EVM_SUPPORT_ONLY',
};
