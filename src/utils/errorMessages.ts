export const errorMessages = {
  CHANGE_API_INVALID_TITLE_OR_EIN:
    'ChangeAPI title or EIN not found or invalid',
  CHANGE_API_TITLE_OR_EIN_NOT_PRECISE:
    'Please query the exact project title or EIN ID from the ChangeAPI site',
  YOU_ARE_NOT_OWNER_OF_THIS_DONATION: 'You are now owner of this donation',
  NOT_SUPPORTED_THIRD_PARTY_API: 'Third Party API not supported',
  IPFS_IMAGE_UPLOAD_FAILED: 'Image upload failed',
  INVALID_FROM_DATE: 'Invalid fromDate',
  INVALID_TO_DATE: 'Invalid toDate',
  INVALID_AUTHORIZATION_VERSION: 'Authorizatio version is not valid',
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
  PROJECT_STATUS_NOT_FOUND:
    'No project status found, this should be impossible',
  YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT:
    'You dont have access to deactivate this project',
  PROJECT_NOT_FOUND: 'Project not found.',
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
  AMOUNT_IS_INVALID: 'Amount is not valid',
  CURRENCY_IS_INVALID: 'Currency is not valid',
};
