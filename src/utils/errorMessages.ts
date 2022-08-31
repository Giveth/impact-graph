export const errorMessages = {
  CHANGE_API_INVALID_TITLE_OR_EIN:
    'ChangeAPI title or EIN not found or invalid',
  INVALID_SOCIAL_NETWORK: 'Invalid social network',
  IT_SHOULD_HAVE_ONE_OR_TWO_ADDRESSES_FOR_RECIPIENT:
    'It should have one or two wallet recipient addresses',
  NOT_IMPLEMENTED: 'Not implemented',
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
  PROJECT_IS_NOT_ACTIVE: 'Project is not active.',
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
  INVALID_WALLET_ADDRESS: 'Eth address not valid',
  INVALID_EMAIL: 'Email not valid',
  UN_AUTHORIZED: 'unAuthorized',
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
};
