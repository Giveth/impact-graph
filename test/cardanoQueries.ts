export const createCardanoDonationMutation = `
  mutation (
    $amount: Float!
    $transactionId: String!
    $projectId: Float!
    $fromWalletAddress: String!
    $toWalletAddress: String!
    $token: String
    $tokenAddress: String
    $anonymous: Boolean
    $valueUsd: Float
    $priceUsd: Float
    $userId: Float
  ) {
    createCardanoDonation(
      amount: $amount
      transactionId: $transactionId
      projectId: $projectId
      fromWalletAddress: $fromWalletAddress
      toWalletAddress: $toWalletAddress
      token: $token
      tokenAddress: $tokenAddress
      anonymous: $anonymous
      valueUsd: $valueUsd
      priceUsd: $priceUsd
      userId: $userId
    )
  }
`;
