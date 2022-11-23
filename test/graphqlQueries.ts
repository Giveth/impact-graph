export const createDonationMutation = `
  mutation (
    $transactionId: String!
    $transactionNetworkId: Float!
    $nonce: Float!
    $amount: Float!
    $token: String!
    $projectId: Float!
    $transakId: String
    $tokenAddress: String
    $anonymous: Boolean
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
      addresses {
        address
        isRecipient
        networkId
      }
      adminUser{
        id
        name
        email
        walletAddress
      }
     addresses {
      address
      isRecipient
      networkId
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
    $projectId: Int!
    $searchTerm: String
    $status: String
    $orderBy: SortBy
  ) {
    donationsByProjectId(
      take: $take
      skip: $skip
      traceable: $traceable
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
  ) {
    projectsPerDate(
      fromDate: $fromDate
      toDate: $toDate
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
  ) {
    totalDonationsPerCategory(
      fromDate: $fromDate
      toDate: $toDate
    ) {
      id
      title
      slug
      totalUsd
    }
  }
`;

export const fetchTotalDonors = `
  query (
    $fromDate: String
    $toDate: String
  ) {
    totalDonorsCountPerDate(
      fromDate: $fromDate
      toDate: $toDate
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
  ) {
    donationsTotalUsdPerDate (
      fromDate: $fromDate
      toDate: $toDate
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
        createdAt
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
    $connectedWalletUserId: Int
  ) {
    allProjects(
      limit: $limit
      skip: $skip
      sortingBy: $sortingBy
      filters: $filters
      searchTerm: $searchTerm
      category: $category
      mainCategory: $mainCategory
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

export const fetchAllProjectsQuery = `
  query (
    $take: Int
    $skip: Int
    $orderBy: OrderBy
    $filterBy: FilterBy
    $searchTerm: String
    $category: String
    $mainCategory: String
    $connectedWalletUserId: Int
  ) {
    projects(
      take: $take
      skip: $skip
      orderBy: $orderBy
      filterBy: $filterBy
      searchTerm: $searchTerm
      category: $category
      mainCategory: $mainCategory
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
        }
        managingFunds {
          description
          relatedAddresses {
            address
            networkId
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
       addresses {
          address
          isRecipient
          networkId
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
            }
            managingFunds {
              description
              relatedAddresses {
                address
                networkId
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

export const getCategoryData = `query {
    categories{
        name
        mainCategory {
            title
            banner
        }
    }
}`;
