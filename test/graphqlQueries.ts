export const createDonationMutation = `
  mutation (
    $transactionId: String
    $transactionNetworkId: Float!
    $nonce: Float!
    $amount: Float!
    $token: String!
    $projectId: Float!
    $transakId: String
    $tokenAddress: String
    $anonymous: Boolean
    $referrerId: String
    $safeTransactionId: String
  ) {
    createDonation(
      transactionId: $transactionId
      transactionNetworkId: $transactionNetworkId
      nonce: $nonce
      amount: $amount
      token: $token
      projectId: $projectId
      transakId: $transakId
      tokenAddress: $tokenAddress
      anonymous: $anonymous
      referrerId: $referrerId
      safeTransactionId: $safeTransactionId
    )
  }
`;

export const createDraftDonationMutation = `
  mutation (
    $networkId: Float!
    $amount: Float!
    $token: String!
    $projectId: Float!
    $tokenAddress: String
    $toAddress: String
    $anonymous: Boolean
    $referrerId: String
    $safeTransactionId: String
  ) {
    createDraftDonation(
      networkId: $networkId
      amount: $amount
      token: $token
      projectId: $projectId
      tokenAddress: $tokenAddress
      toAddress: $toAddress
      anonymous: $anonymous
      referrerId: $referrerId
      safeTransactionId: $safeTransactionId
    )
  }
`;

export const updateDonationStatusMutation = `
  mutation (
    $status: String
    $donationId: Float!
  ) {
    updateDonationStatus(
      status: $status
      donationId: $donationId
    ){
      id
      status
      verifyErrorMessage
    }
  }
`;
export const updateRecurringDonationStatusMutation = `
  mutation (
    $status: String
    $donationId: Float!
  ) {
    updateRecurringDonationStatus(
      status: $status
      donationId: $donationId
    ){
      id
      status
    }
  }
`;

export const createProjectQuery = `
   mutation ($project: CreateProjectInput!) {
      createProject(project: $project) {
        id
        title
        description
        descriptionSummary
        admin
        image
        impactLocation
        slug
        walletAddress
        listed
        reviewStatus
        verified
        organization {
          id
          name
          label
        }
        status {
          name
          id
          symbol
        }
        categories {
          name
        }
        addresses {
          address
          isRecipient
          networkId
          chainType
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
  mutation ($projectId: Float!, $newProjectData: UpdateProjectInput!) {
    updateProject(projectId: $projectId, newProjectData: $newProjectData) {
      id
      title
      description
      descriptionSummary
      image
      slug
      listed
      reviewStatus
      verified
      slugHistory
      creationDate
      admin
      walletAddress
      impactLocation
      categories {
        name
      }
      addresses {
        address
        isRecipient
        networkId
        chainType
      }
      adminUser {
        id
        name
        email
        walletAddress
      }
    }
  }
 `;

export const addRecipientAddressToProjectQuery = `
  mutation ($projectId: Float!, $networkId: Float!, $address: String!, $chainType: ChainType) {
    addRecipientAddressToProject(projectId: $projectId, networkId: $networkId, address: $address, chainType: $chainType) {
      id
      title
      description
      descriptionSummary
      image
      slug
      listed
      reviewStatus
      verified
      slugHistory
      creationDate
      updatedAt
      admin
      walletAddress
      impactLocation
      categories {
        name
      }
      addresses {
        address
        isRecipient
        networkId
        chainType
      }
      adminUser {
        id
        name
        email
        walletAddress
      }
    }
  }
 `;

export const registerOnChainvineQuery = `
  mutation {
    registerOnChainvine {
      id
      firstName
      email
      walletAddress
      chainvineId
    }
  }
`;

export const registerClickOnChainvineQuery = `
  mutation ($referrerId: String!, $walletAddress: String!) {
    registerClickEvent(referrerId: $referrerId, walletAddress: $walletAddress) {
      id
      firstName
      email
      walletAddress
      chainvineId
      isReferrer
      wasReferred
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
        firstName
        email
        walletAddress
      }
      project {
        id
      }
      createdAt
    }
  }
`;

export const fetchDonationsByProjectIdQuery = `
  query (
    $take: Int
    $skip: Int
    $traceable: Boolean
    $qfRoundId: Int
    $projectId: Int!
    $searchTerm: String
    $status: String
    $orderBy: SortBy
  ) {
    donationsByProjectId(
      take: $take
      skip: $skip
      traceable: $traceable
      qfRoundId: $qfRoundId
      projectId: $projectId
      searchTerm: $searchTerm
      status: $status
      orderBy: $orderBy
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
        qfRound {
          id
        }
        status
        user {
          id
          walletAddress
          firstName
          email
        }
        createdAt
      }
      totalCount
      totalUsdBalance
    }
  }
`;
export const fetchRecurringDonationsByProjectIdQuery = `
  query (
    $take: Int
    $skip: Int
    $projectId: Int!
    $searchTerm: String
    $status: String
    $finished: Boolean
    $orderBy: RecurringDonationSortBy
  ) {
    recurringDonationsByProjectId(
      take: $take
      skip: $skip
      projectId: $projectId
      searchTerm: $searchTerm
      status: $status
      finished: $finished
      orderBy: $orderBy

    ) {
      recurringDonations {
        id
        txHash
        networkId
        flowRate
        currency
        anonymous
        status
        donor {
          id
          walletAddress
          firstName
          email
        }
        createdAt
      }
      totalCount
    }
  }
`;

export const fetchRecurringDonationsByUserIdQuery = `
  query (
    $take: Int
    $skip: Int
    $status: String
    $orderBy: RecurringDonationSortBy
    $finished: Boolean
    $userId: Int!
  ) {
    recurringDonationsByUserId(
      take: $take
      skip: $skip
      orderBy: $orderBy
      userId: $userId
      status: $status
      finished: $finished
    ) {
      recurringDonations {
        id
        txHash
        networkId 
        flowRate
        currency
        anonymous
        status
        donor {
          id
          walletAddress
          firstName
          email
        }
        createdAt
      }
      totalCount
    }
  }
`;

export const donationsFromWallets = `
  query (
    $fromWalletAddresses: [String!]!

  ) {
    donationsFromWallets(
      fromWalletAddresses: $fromWalletAddresses
    ) {
    transactionId
    amount
    currency
    transactionNetworkId
    priceEth
    fromWalletAddress
    toWalletAddress
    user {
      id
      email
      firstName
      walletAddress
      }
    }
  }
`;

export const donationsToWallets = `
  query (
    $toWalletAddresses: [String!]!

  ) {
    donationsToWallets(
      toWalletAddresses: $toWalletAddresses
    ) {
    transactionId
    amount
    currency
    transactionNetworkId
    priceEth
    fromWalletAddress
    toWalletAddress
    user {
      id
      email
      firstName
      walletAddress
      }
    }
  }
`;

export const fetchNewProjectsPerDate = `
  query (
    $fromDate: String
    $toDate: String
    $onlyListed: Boolean
    $onlyVerified: Boolean
    $includesOptimism: Boolean
  ) {
    projectsPerDate(
      fromDate: $fromDate
      toDate: $toDate
      onlyListed: $onlyListed
      onlyVerified: $onlyVerified
      includesOptimism: $includesOptimism
    ) {
      total
      totalPerMonthAndYear {
        total
        date
      }
    }
  }
`;

export const fetchTotalDonationsPerCategoryPerDate = `
  query (
    $fromDate: String
    $toDate: String
    $fromOptimismOnly: Boolean
  ) {
    totalDonationsPerCategory(
      fromDate: $fromDate
      toDate: $toDate
      fromOptimismOnly: $fromOptimismOnly
    ) {
      id
      title
      slug
      totalUsd
    }
  }
`;

export const fetchRecentDonations = `
  query (
    $take: Int
  ) {
    recentDonations(
      take: $take
    ) {
      id
      valueUsd
      createdAt
      project {
        slug
        title
      }
      user {
        walletAddress
      }
    }
  }
`;

export const fetchTotalDonors = `
  query (
    $fromDate: String
    $toDate: String
    $fromOptimismOnly: Boolean
  ) {
    totalDonorsCountPerDate(
      fromDate: $fromDate
      toDate: $toDate
      fromOptimismOnly: $fromOptimismOnly
    ) {
      total
      totalPerMonthAndYear {
        total
        date
      }
    }
  }
`;

export const fetchTotalDonationsUsdAmount = `
  query (
    $fromDate: String
    $toDate: String
    $fromOptimismOnly: Boolean
  ) {
    donationsTotalUsdPerDate (
      fromDate: $fromDate
      toDate: $toDate
      fromOptimismOnly: $fromOptimismOnly
    ) {
      total
      totalPerMonthAndYear {
        total
        date
      }
    }
  }
`;

export const fetchTotalDonationsNumberPerDateRange = `
  query (
    $fromDate: String
    $toDate: String
    $fromOptimismOnly: Boolean
  ) {
    totalDonationsNumberPerDate (
      fromDate: $fromDate
      toDate: $toDate
      fromOptimismOnly: $fromOptimismOnly
    ) {
      total
      totalPerMonthAndYear {
        total
        date
      }
    }
  }
`;

export const fetchAllDonationsQuery = `
  query (
    $fromDate: String
    $toDate: String
  ) {
    donations(
      fromDate: $fromDate
      toDate: $toDate
    ) {
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
          walletAddress
          firstName
          email
        }
        project {
          listed
          reviewStatus
          verified
          slug
          admin
          title
          categories {
            name
            id
          }
        }
        createdAt
        status
    }
  }
`;

export const fetchDonationsByUserIdQuery = `
  query (
    $take: Int
    $skip: Int
    $status: String
    $orderBy: SortBy
    $userId: Int!
  ) {
    donationsByUserId(
      take: $take
      skip: $skip
      orderBy: $orderBy
      userId: $userId
      status: $status
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
        status
        user {
          id
          walletAddress
          email
          firstName
        }
        project {
          id
        }
       qfRound {
          id
          name
          isActive
        }
        createdAt
      }
      totalCount
    }
  }
`;

export const fetchFeaturedProjectUpdate = `
  query featuredProjectUpdate($projectId: Int!) {
    featuredProjectUpdate(projectId: $projectId) {
      id
      title
      projectId
      userId
      content
      isMain
      totalReactions
      createdAt
    }
  }
`;

export const fetchFeaturedProjects = `
  query (
    $limit: Int
    $skip: Int
    $connectedWalletUserId: Int
  ) {
    featuredProjects(
      limit: $limit
      skip: $skip
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
        reaction {
          id
        }
        adminUser {
          id
          email
          firstName
          walletAddress
        }
        organization {
          name
          label
          supportCustomTokens
        }
        addresses {
          address
          isRecipient
          networkId
          chainType
        }
        projectPower {
          totalPower
          powerRank
          round
        }
        totalReactions
        totalDonations
        totalTraceDonations
        featuredUpdate {
          id
          position
        }
      }
      totalCount
    }
  }
`;

export const fetchMultiFilterAllProjectsQuery = `
  query (
    $limit: Int
    $skip: Int
    $sortingBy: SortingField
    $filters: [FilterField!]
    $searchTerm: String
    $category: String
    $mainCategory: String
    $campaignSlug: String
    $connectedWalletUserId: Int
    $qfRoundId: Int
    $qfRoundSlug: String
  ) {
    allProjects(
      limit: $limit
      skip: $skip
      sortingBy: $sortingBy
      filters: $filters
      searchTerm: $searchTerm
      category: $category
      campaignSlug: $campaignSlug
      mainCategory: $mainCategory
      connectedWalletUserId: $connectedWalletUserId
      qfRoundId: $qfRoundId
      qfRoundSlug: $qfRoundSlug
    ) {
    
      campaign{
        slug
        title
      }
      
      projects {
        id
        title
        balance
        image
        slug
        description
        descriptionSummary
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
        reviewStatus
        givingBlocksId
        status {
          id
          symbol
          name
          description
        }
        categories {
          name
          mainCategory {
            title
            slug
            banner
            description
          }
        }
        reaction {
          id
        }
        adminUser {
          id
          email
          firstName
          walletAddress
        }
        organization {
          name
          label
          supportCustomTokens
        }
        addresses {
          address
          isRecipient
          networkId
          chainType
        }
        projectPower {
          totalPower
          powerRank
          round
        }
        projectInstantPower {
          totalPower
          powerRank
        }
        qfRounds {
          name
          isActive
          id
          maximumReward
        }
        totalReactions
        totalDonations
        totalTraceDonations
        sumDonationValueUsdForActiveQfRound
        sumDonationValueUsd
        countUniqueDonorsForActiveQfRound
        countUniqueDonors
        estimatedMatching{
           projectDonationsSqrtRootSum
           allProjectsSum
           matchingPool
        }
      }
      totalCount
      categories {
        name
      }
    }
  }
`;

export const expectedMatchingFormulaQuery = `
  query (
    projectId: Int!
  ) {
    expectedMatching(
      projectId: $projectId
    ) {
      projectDonationsSqrtRootSum
      otherProjectsSum
      matchingPool
    }
  }
`;

export const qfRoundStatsQuery = `
  query (
    $slug: String!
  ) {
    qfRoundStats(
      slug: $slug
    ) {
      uniqueDonors
      allDonationsUsdValue
      matchingPool
    }
  }
`;

export const getQfRoundHistoryQuery = `
    query (
      $projectId: Int!
      $qfRoundId: Int!
    ) {
      getQfRoundHistory(
        projectId: $projectId
        qfRoundId: $qfRoundId
      ) {
        uniqueDonors
        raisedFundInUsd
        donationsCount
        matchingFund
        distributedFundNetwork
        distributedFundTxHash
        estimatedMatching {
         projectDonationsSqrtRootSum
         allProjectsSum
         matchingPool
        }
      }
    }
`;

export const fetchProjectBySlugQuery = `
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
      reviewStatus
      givingBlocksId
      campaigns {
        id
        title
        description
        type
        photo
        video
        videoPreview
        slug
        isActive
        order
        landingLink
        filterFields
        sortingField
        createdAt
        updatedAt
      
      }
      givbackFactor
      projectPower {
        totalPower
        powerRank
        round
      }
      projectInstantPower {
        totalPower
      }
      projectFuturePower {
        totalPower
        powerRank
        round
      }
      categories {
       name
       mainCategory {
         title
         slug
         banner
         description
       }
      }
      verificationFormStatus
      qfRounds {
        id
        name
        isActive
      }
      projectVerificationForm {
        status
        id
        isTermAndConditionsAccepted
        emailConfirmationTokenExpiredAt
        email
        emailConfirmationToken
        emailConfirmationSent
        emailConfirmationSentAt
        emailConfirmedAt
        emailConfirmed
        projectRegistry {
          organizationDescription
          isNonProfitOrganization
          organizationCountry
          organizationWebsite
          attachments
          organizationName
        }
        personalInfo {
          email
          walletAddress
          fullName
        }
        projectContacts {
          name
          url
        }
        milestones {
          mission
          foundationDate
          achievedMilestones
          achievedMilestonesProofs
          problem
          plans
          impact
        }
        managingFunds {
          description
          relatedAddresses {
            address
            networkId
            chainType
            title
          }
        }
      }
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
      organization {
        name
        label
        supportCustomTokens
      }
      addresses {
        address
        isRecipient
        networkId
        chainType
      }
      anchorContracts {
        txHash
        address
        networkId
        isActive
       } 
      adminUser {
        id
        email
        firstName
        walletAddress
      }
      totalReactions
      totalDonations
      totalTraceDonations
    }
  }
`;

export const getDonationCurrencyStats = `
  query {
    getDonationStats {
      currency
      uniqueDonorCount
      currencyPercentage
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
        reviewStatus
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
       addresses {
          address
          isRecipient
          networkId
          chainType
        }
        adminUser {
          id
          email
          firstName
          walletAddress
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
        reviewStatus
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
        addresses {
          address
          isRecipient
          networkId
          chainType
        }
        adminUser {
          id
          email
          firstName
          walletAddress
        }
        organization {
          label
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
      isSignedIn
      boostedProjectsCount
      likedProjectsCount
      donationsCount
      projectsCount
      passportScore
      passportStamps
    }
  }
`;

export const refreshUserScores = `
  query ($address: String!) {
    refreshUserScores(address: $address) {
      id
      firstName
      lastName
      name
      email
      avatar
      walletAddress
      url
      location
      boostedProjectsCount
      likedProjectsCount
      donationsCount
      projectsCount
      passportScore
      passportStamps
    }
  }
`;

export const uploadImageToIpfsQuery = `
  mutation ($fileUpload: FileUploadInputType!) {
    upload(fileUpload: $fileUpload)
  }
`;

export const traceImageUploadQuery = `
  mutation ($traceFileUpload: TraceFileUploadInputType!) {
    traceImageUpload(traceFileUpload: $traceFileUpload)
  }
`;

export const unlikeProjectQuery = `
  mutation ($reactionId: Int!) {
    unlikeProject(reactionId: $reactionId)
  }
`;

export const addProjectUpdateQuery = `
        mutation addProjectUpdate($projectId: Float! $content: String!
                   $title: String!){
       addProjectUpdate(content: $content projectId: $projectId
                    title: $title) {
                    userId
                    projectId
                    id
                    title
                    }
         }`;

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

export const fetchLatestProjectUpdates = `
  query (
    $take: Int,
    $skip: Int
  ) {
    projectUpdates(
      take: $take,
      skip: $skip
    ) {
      projectUpdates {
        id
        title
        projectId
        userId
        content
        isMain
        totalReactions
        createdAt
        reaction {
          id
          userId
          reaction
          projectUpdateId
        }
        project {
          id
          slug
          totalReactions
        }
      }
      count
    }
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

export const projectsBySlugsQuery = `
  query ($take: Float, $skip: Float, $slugs: [String!]!) {
      projectsBySlugs(take: $take, skip: $skip, slugs: $slugs) {
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
          reviewStatus
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
          addresses {
            address
            isRecipient
            networkId
            chainType
          }
          organization {
            label
          }
          adminUser {
            firstName
            email
            id
            walletAddress
          }
          qualityScore
        }
        totalCount
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
          reviewStatus
          givingBlocksId
          qfRounds {
            name
            id
          }
          projectVerificationForm {
            id
            isTermAndConditionsAccepted
            emailConfirmationTokenExpiredAt
            email
            emailConfirmationToken
            emailConfirmationSent
            emailConfirmationSentAt
            emailConfirmedAt
            emailConfirmed
            projectRegistry {
              organizationDescription
              isNonProfitOrganization
              organizationCountry
              organizationWebsite
              attachments
              organizationName
            }
            personalInfo {
              email
              walletAddress
              fullName
            }
            projectContacts {
              name
              url
            }
            milestones {
              mission
              foundationDate
              achievedMilestones
              achievedMilestonesProofs
              problem
              plans
              impact
            }
            managingFunds {
              description
              relatedAddresses {
                address
                networkId
                chainType
                title
              }
            }
            status
          }
          categories {
            name
          }
          reaction {
            reaction
            id
            projectUpdateId
            userId
          }
          addresses {
            address
            isRecipient
            networkId
            chainType
          }
          organization {
            label
          }
          adminUser {
            firstName
            email
            id
            walletAddress
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
      reviewStatus
      description,
      walletAddress
      admin
      categories{
          name
      }
      reaction {
        id
      }
      addresses {
        address
        isRecipient
        networkId
        chainType
      }
      anchorContracts {
        txHash
        address
        networkId
        isActive
       } 
      organization {
        name
        label
        supportCustomTokens
      }
      categories {
        name
        mainCategory {
          title
          slug
          banner
          description
        }
      }
      adminUser {
        firstName
        email
        id
        walletAddress
      }
    }
  }
`;

export const getProjectsAcceptTokensQuery = `
  query(
      $projectId: Float!,
  ){
    getProjectAcceptTokens(
     projectId:$projectId){
      id
      symbol
      networkId
      chainType
      decimals
      mainnetAddress
      name
    }
  }
`;

export const getPurpleList = `
  query{
    getPurpleList
  }
`;

export const walletAddressIsPurpleListed = `
  query walletAddressIsPurpleListed($address: String!) {
    walletAddressIsPurpleListed(address: $address)
  }
`;

export const walletAddressIsValid = `
  query WalletAddressIsValid($address: String!) {
    walletAddressIsValid(address: $address)
  }
`;

export const deleteProjectUpdateQuery = `
        mutation deleteProjectUpdate($updateId: Float!){
       deleteProjectUpdate(updateId: $updateId
                    )
         }`;

export const editProjectUpdateQuery = `
        mutation editProjectUpdate($updateId: Float! $content: String!
                   $title: String!){
       editProjectUpdate(content: $content updateId: $updateId
                    title: $title) {
                    userId
                    projectId
                    title
                    content
                    contentSummary
                    }
         }`;

export const createProjectVerificationFormMutation = `
        mutation createProjectVerificationForm($slug: String!){
           createProjectVerificationForm(slug: $slug) {
                    id
                    isTermAndConditionsAccepted
                    emailConfirmationToken
                    emailConfirmationSent
                    emailConfirmationSentAt
                    emailConfirmedAt
                    emailConfirmed
                    projectRegistry {
                      organizationDescription
                      isNonProfitOrganization
                      organizationCountry
                      organizationWebsite
                      attachments
                      organizationName
                    }
                    projectContacts {
                      name
                      url
                    }
                    milestones {
                      mission
                      foundationDate
                      achievedMilestones
                      achievedMilestonesProofs
                    }
                    managingFunds {
                      description
                      relatedAddresses {
                        address
                        networkId
                        title
                      }
                    }
                    user {
                      id
                      walletAddress
                    }
                    project {
                      id
                      slug
                    }
                    status
                    }

            }
        `;

export const getCurrentProjectVerificationFormQuery = `
        query getCurrentProjectVerificationForm($slug: String!){
           getCurrentProjectVerificationForm(slug: $slug) {
                    id
                    isTermAndConditionsAccepted
                    emailConfirmationTokenExpiredAt
                    email
                    emailConfirmationToken
                    emailConfirmationSent
                    emailConfirmationSentAt
                    emailConfirmedAt
                    emailConfirmed
                    projectRegistry {
                      organizationDescription
                      isNonProfitOrganization
                      organizationCountry
                      organizationWebsite
                      attachments
                      organizationName
                    }
                    projectContacts {
                      name
                      url
                    }
                    milestones {
                      mission
                      foundationDate
                      achievedMilestones
                      achievedMilestonesProofs
                    }
                    socialProfiles {
                      name
                      socialNetworkId
                      socialNetwork
                      isVerified
                    }
                    managingFunds {
                      description
                      relatedAddresses {
                        address
                        networkId
                        title
                      }
                    }
                    user {
                      id
                      walletAddress
                    }
                    project {
                      id
                      slug
                    }
                    status
                    }

            }
        `;

export const projectVerificationConfirmEmail = `
        mutation projectVerificationConfirmEmail($emailConfirmationToken: String!){
          projectVerificationConfirmEmail(emailConfirmationToken: $emailConfirmationToken) {
            id
            isTermAndConditionsAccepted
            emailConfirmationTokenExpiredAt
            email
            emailConfirmationToken
            emailConfirmationSent
            emailConfirmationSentAt
            emailConfirmedAt
            emailConfirmed
            projectRegistry {
              organizationDescription
              isNonProfitOrganization
              organizationCountry
              organizationWebsite
              attachments
              organizationName
            }
            personalInfo {
              email
              walletAddress
              fullName
            }
            projectContacts {
              name
              url
            }
            milestones {
              mission
              foundationDate
              achievedMilestones
              achievedMilestonesProofs
            }
            managingFunds {
              description
              relatedAddresses {
                address
                networkId
                title
              }
            }
            user {
              id
              walletAddress
            }
            project {
              id
              slug
            }
            status
            lastStep
          }
        }
`;

export const projectVerificationSendEmailConfirmation = `
        mutation projectVerificationSendEmailConfirmation($projectVerificationFormId: Float!){
          projectVerificationSendEmailConfirmation(projectVerificationFormId: $projectVerificationFormId) {
            id
            isTermAndConditionsAccepted
            emailConfirmationTokenExpiredAt
            email
            emailConfirmationToken
            emailConfirmationSent
            emailConfirmationSentAt
            emailConfirmedAt
            emailConfirmed
            projectRegistry {
              organizationDescription
              isNonProfitOrganization
              organizationCountry
              organizationWebsite
              attachments
              organizationName
            }
            personalInfo {
              email
              walletAddress
              fullName
            }
            projectContacts {
              name
              url
            }
            socialProfiles {
              name
              socialNetwork
              socialNetworkId
            }
            milestones {
              mission
              foundationDate
              achievedMilestones
              achievedMilestonesProofs
            }
            managingFunds {
              description
              relatedAddresses {
                address
                networkId
                title
              }
            }
            user {
              id
              walletAddress
            }
            project {
              id
              slug
            }
            status
          }
        }
`;

export const updateProjectVerificationFormMutation = `
        mutation updateProjectVerificationForm($projectVerificationUpdateInput: ProjectVerificationUpdateInput!){
           updateProjectVerificationForm(projectVerificationUpdateInput: $projectVerificationUpdateInput) {
                    id
                    isTermAndConditionsAccepted
                    emailConfirmationTokenExpiredAt
                    email
                    emailConfirmationToken
                    emailConfirmationSent
                    emailConfirmationSentAt
                    emailConfirmedAt
                    emailConfirmed
                    projectRegistry {
                      organizationDescription
                      isNonProfitOrganization
                      organizationCountry
                      organizationWebsite
                      attachments
                      organizationName
                    }
                    personalInfo {
                      email
                      walletAddress
                      fullName
                    }
                    projectContacts {
                      name
                      url
                    }
                    milestones {
                      mission
                      foundationDate
                      achievedMilestones
                      achievedMilestonesProofs
                    }
                    managingFunds {
                      description
                      relatedAddresses {
                        chainType
                        address
                        networkId
                        title
                      }
                    }
                    user {
                      id
                      walletAddress
                    }
                    project {
                      id
                      slug
                    }
                    status
                    lastStep
                    }

            }
        `;

export const addNewSocialProfileMutation = `
        mutation addNewSocialProfile($projectVerificationId: Int!, $socialNetwork: String!){
           addNewSocialProfile(projectVerificationId:$projectVerificationId, socialNetwork:$socialNetwork)
          }
        `;

export const removeSocialProfileMutation = `
        mutation removeSocialProfile( $socialProfileId: Int!){
           removeSocialProfile(socialProfileId:$socialProfileId)
          }
        `;

export const getAllowedCountries = `
    query {
        getAllowedCountries {
            name
            code
        }
    }
        `;

export const getMainCategoriesData = `
query {
    mainCategories{
        title
        banner
        slug
        description
        categories {
            name
            value
            isActive
        }
    }
}`;

export const getCampaigns = `
query {
    campaigns{
        id
        title
        description
        type
        relatedProjects {
          id
          slug
        }
        relatedProjectsCount
        photo
        video
        videoPreview
        slug
        isActive
        order
        landingLink
        filterFields
        sortingField
        createdAt
        updatedAt
    }
}`;

export const fetchCampaignBySlug = `
  query (
    $slug: String
  ) {
    findCampaignBySlug(
      slug: $slug
    ){
        id
        title
        type
        description
        relatedProjects {
          id
          slug  
        }
        relatedProjectsCount
        photo
        video
        videoPreview
        slug
        isActive
        order
        landingLink
        filterFields
        sortingField
        createdAt
        updatedAt
    }
}`;

export const getCategoryData = `query {
    categories{
        name
        mainCategory {
            title
            banner
        }
    }
}`;

export const setSinglePowerBoostingMutation = `
        mutation ($projectId: Int!, $percentage: Float!) {
          setSinglePowerBoosting(projectId: $projectId, percentage: $percentage) {
            id
            user {
              id
            }
            project {
              id
            }
            percentage
          }
        }
 `;

export const setMultiplePowerBoostingMutation = `
        mutation ($projectIds: [Int!]!, $percentages: [Float!]!) {
          setMultiplePowerBoosting(projectIds: $projectIds, percentages: $percentages) {
            id
            user {
              id
            }
            project {
              id
            }
            percentage
          }
        }
 `;

export const getPowerBoostingsQuery = `
  query (
    $take: Int
    $skip: Int
    $orderBy: PowerBoostingOrderBy
    $projectId: Int
    $userId: Int
  ) {
    getPowerBoosting(
      take: $take
      skip: $skip
      orderBy: $orderBy
      projectId: $projectId
      userId: $userId
    ) {
      powerBoostings {
            id
            updatedAt
            createdAt
            user {
              id
              email
            }
            project {
              id
            }
            percentage
      }
    }
  }
`;

export const getUserProjectPowerQuery = `
  query (
    $take: Int
    $skip: Int
    $orderBy: UserPowerOrderBy
    $projectId: Int
    $userId: Int
  ) {
    userProjectPowers (
      take: $take
      skip: $skip
      orderBy: $orderBy
      projectId: $projectId
      userId: $userId
    ) {
      totalCount
      userProjectPowers {
            id
            userId
            projectId
            round
            boostedPower
            rank
            user {
              id
              firstName
              lastName
              name
            }

      }
    }
  }
`;

export const getBottomPowerRankQuery = `
    query {
        getTopPowerRank
    }
`;

export const getPowerAmountRankQuery = `
    query (
      $powerAmount: Float!
      $projectId: Int
      ) {
        powerAmountRank(powerAmount: $powerAmount, projectId: $projectId)
    }
`;

export const getProjectUserInstantPowerQuery = `
  query ($projectId: Int!, $take: Int, $skip: Int)
   {
    getProjectUserInstantPower (projectId: $projectId, take: $take, skip: $skip) {
    projectUserInstantPowers {
      id
      userId
      projectId
      boostedPower
      user {
        name
        walletAddress
        avatar
        }
      }
      total
    }
  }
  `;

export const doesDonatedToProjectInQfRoundQuery = `
  query (
   $projectId: Int!,
   $qfRoundId: Int!,
   $userId: Int!
  ) {
    doesDonatedToProjectInQfRound(
      projectId: $projectId
      qfRoundId: $qfRoundId
      userId: $userId
    )
  }
`;

export const createAnchorContractAddressQuery = `
  mutation ($projectId: Int!,
            $networkId: Int!, 
            $address: String!,
            $txHash: String!
            ) {
    addAnchorContractAddress(
      projectId: $projectId 
      networkId: $networkId
       address:$address
       txHash:$txHash
        ) {
      id
      address
      isActive
    }
  }
`;

export const createRecurringDonationQuery = `
  mutation ($projectId: Int!,
            $networkId: Int!, 
            $txHash: String!
            $flowRate: String!
            $currency: String!
            $anonymous: Boolean
            ) {
    createRecurringDonation(
      projectId: $projectId 
      networkId: $networkId
      txHash:$txHash
      flowRate: $flowRate
      currency:$currency
      anonymous:$anonymous
        ) {
      txHash
      networkId
      anonymous
    }
  }
`;

export const updateRecurringDonationQuery = `
       mutation (
        $projectId: Int!,
        $networkId: Int!,
        $txHash: String!
        $flowRate: String!
        $currency: String!
        $anonymous: Boolean!
        ) {
          updateRecurringDonationParams(
            projectId: $projectId
            networkId: $networkId
            txHash:$txHash
            anonymous:$anonymous
            flowRate:$flowRate
            currency:$currency
        ) {
            txHash
            networkId
            currency
            flowRate
            anonymous
          }
      }
`;
