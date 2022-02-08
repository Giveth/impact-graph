export const saveDonationQuery = `
        mutation SaveDonation($chainId: Float! $projectId: Float! 
                   $token: String! $transactionNetworkId: Float! $transactionId: String! 
                   $amount: Float! $toAddress: String! $fromAddress: String!){
       saveDonation(chainId: $chainId projectId: $projectId 
                    token: $token transactionNetworkId: $transactionNetworkId 
                    transactionId: $transactionId amount: $amount 
                     toAddress: $toAddress fromAddress: $fromAddress) 
         }`;

export const addProjectQuery = `
       mutation ($project: ProjectInput!) {
          addProject(project: $project) {
            id
            title
            description
            admin
            image
            impactLocation
            slug
            walletAddress
            listed
            verified
            status {
              name
              id
              symbol
            }
            categories {
              name
            }
          }
      }
  `;

export const editProjectQuery = `
  mutation ($projectId: Float!, $newProjectData: ProjectInput!) {
    editProject(projectId: $projectId, newProjectData: $newProjectData) {
      id
      title
      description
      image
      slug
      listed
      verified
      slugHistory
      creationDate
      admin
      walletAddress
      impactLocation
      categories {
        name
      }
    }
  }
 `;

export const fetchDonationsByDonorQuery = `
  query {
    donationsByDonor {
      id
      transactionId
      transactionNetworkId
      toWalletAddress
      fromWalletAddress
      currency
      anonymous
      amount
      user {
        id
      }
      project {
        id
      }
      createdAt
    }
  }
`;

export const fetchAllProjectsQuery = `
  query (
    $take: Int
    $skip: Int
    $orderBy: OrderBy
    $filterBy: FilterBy
    $searchTerm: String
    $category: String
  ) {
    projects(
      take: $take
      skip: $skip
      orderBy: $orderBy
      filterBy: $filterBy
      searchTerm: $searchTerm
      category: $category
    ) {
      projects {
        id
        title
        balance
        image
        slug
        creationDate
        updatedAt
        admin
        description
        walletAddress
        impactLocation
        qualityScore
        verified
        traceCampaignId
        listed
        givingBlocksId
        status {
          id
          symbol
          name
          description
        }
        categories {
          name
        }
        reactions {
          reaction
          id
          projectUpdateId
          userId
        }
        qualityScore
        totalReactions
        totalDonations
        totalTraceDonations
      }
      totalCount
      categories {
        name
      }
    }
  }
`;
