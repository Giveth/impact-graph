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
            adminUser{
              id
              name
              email
              walletAddress
            }
          }
      }
  `;

export const createProjectQuery = `
       mutation ($project: CreateProjectInput!) {
          createProject(project: $project) {
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
            adminUser{
              id
              name
              email
              walletAddress
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
      adminUser{
        id
        name
        email
        walletAddress
      }
    }
  }
 `;

export const updateProjectQuery = `
  mutation ($projectId: Float!, $newProjectData: CreateProjectInput!) {
    updateProject(projectId: $projectId, newProjectData: $newProjectData) {
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
      adminUser{
        id
        name
        email
        walletAddress
      }
    }
  }
 `;

export const deactivateProjectQuery = `
  mutation ($projectId: Float!, $reasonId: Float) {
    deactivateProject(projectId: $projectId, reasonId: $reasonId)
  }
 `;

export const activateProjectQuery = `
  mutation ($projectId: Float!) {
    activateProject(projectId: $projectId)
  }
 `;

export const projectStatusReasonsQuery = `
  query ($statusId: Float) {
      getStatusReasons(statusId: $statusId) {
                      description
                      status {
                          id
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

export const fetchDonationsByUserIdQuery = `
  query (
    $take: Int
    $skip: Int
    $orderBy: SortBy
    $userId: Int!
  ) {
    donationsByUserId(
      take: $take
      skip: $skip
      orderBy: $orderBy
      userId: $userId
    ) {
      donations {
        id
        transactionId
        transactionNetworkId
        toWalletAddress
        fromWalletAddress
        currency
        anonymous
        valueUsd
        amount
        user {
          id
        }
        project {
          id
        }
        createdAt
      }
      totalCount
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
    $connectedWalletUserId: Int
  ) {
    projects(
      take: $take
      skip: $skip
      orderBy: $orderBy
      filterBy: $filterBy
      searchTerm: $searchTerm
      category: $category
      connectedWalletUserId: $connectedWalletUserId
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
        reaction {
          id
        }
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

export const fetchProjectsBySlugQuery = `
  query (
    $slug: String!
  ) {
    projectBySlug(
      slug: $slug
    ) {
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
      reaction {
        id
        userId
        reaction
      }
      totalReactions
      totalDonations
      totalTraceDonations
    }
  }
`;

export const fetchSimilarProjectsBySlugQuery = `
  query (
    $slug: String!
    $take: Int
    $skip: Int
  ) {
    similarProjectsBySlug(
      slug: $slug
      take: $take
      skip: $skip
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
        reaction {
          id
          userId
          reaction
        }
        totalReactions
        totalDonations
        totalTraceDonations
      }
      totalCount
    }
  }
`;

export const fetchLikedProjectsQuery = `
  query (
    $userId: Int!
    $take: Int
    $skip: Int
  ) {
    likedProjectsByUserId(
      userId: $userId
      take: $take
      skip: $skip
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
        reaction {
          id
          userId
          reaction
        }
        totalReactions
        totalDonations
        totalTraceDonations
      }
      totalCount
    }
  }
`;

export const likeProjectQuery = `
  mutation ($projectId: Int!) {
    likeProject(projectId: $projectId) {
      id
      projectId
      reaction
    }
  }
`;

export const updateUser = `
  mutation(
    $url: String
    $location: String
    $email: String
    $lastName: String
    $firstName: String
    $avatar: String
  ) {
    updateUser(
      url: $url
      location: $location
      email: $email
      firstName: $firstName
      lastName: $lastName
      avatar: $avatar
    )
  }
`;

export const userByAddress = `
  query ($address: String!) {
    userByAddress(address: $address) {
      id
      firstName
      lastName
      name
      email
      avatar
      walletAddress
      url
      location
    }
  }
`;
export const uploadImageToIpfsQuery = `
  mutation ($fileUpload: FileUploadInputType!) {
    upload(fileUpload: $fileUpload)
  }
`;

export const unlikeProjectQuery = `
  mutation ($reactionId: Int!) {
    unlikeProject(reactionId: $reactionId)
  }
`;

export const likeProjectUpdateQuery = `
  mutation ($projectUpdateId: Int!) {
    likeProjectUpdate(projectUpdateId: $projectUpdateId) {
      id
      projectUpdateId
      reaction
    }
  }
`;

export const unlikeProjectUpdateQuery = `
  mutation ($reactionId: Int!) {
    unlikeProjectUpdate(reactionId: $reactionId)
  }
`;

export const fetchProjectUpdatesQuery = `
  query (
    $projectId: Int!, 
    $take: Int, 
    $skip: Int,
    $connectedWalletUserId: Int,
    $orderBy: OrderBy
  ) {
    getProjectUpdates(
      projectId: $projectId, 
      take: $take, 
      skip: $skip,
      connectedWalletUserId: $connectedWalletUserId,
      orderBy: $orderBy
    ) {
      id
      title
      projectId
      userId
      content
      isMain
      totalReactions
      reaction {
        id
        userId
        reaction
        projectUpdateId
      }
    }
  }
`;

export const projectsByUserIdQuery = `
  query ($take: Float, $skip: Float, $userId: Int!) {
      projectsByUserId(take: $take, skip: $skip, userId: $userId) {
        projects {
          id
          title
          balance
          description
          image
          slug
          creationDate
          admin
          walletAddress
          impactLocation
          listed
          givingBlocksId
          categories {
            name
          }
          reaction {
            reaction
            id
            projectUpdateId
            userId
          }
          qualityScore
        }
        totalCount
      }
    }
  `;

export const projectByIdQuery = `
  query(
      $id: Float!, 
      $connectedWalletUserId: Int, 
  ){
    projectById(
     id:$id,
     connectedWalletUserId: $connectedWalletUserId){
      id
      slug,
      verified
      title,
      listed,
      description,
      walletAddress
      admin
      categories{
          name
      }
      reaction {
        id
      }
    }
  }
`;

export const walletAddressIsValid = `
  query WalletAddressIsValid($address: String!) {
    walletAddressIsValid(address: $address)
  }
`;
