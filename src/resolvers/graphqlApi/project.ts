import gql from 'graphql-tag';

// @ts-expect-error migrate to ESM
const FETCH_PROJECTS = gql`
  query FetchProjects($limit: Int, $skip: Int, $orderBy: OrderBy) {
    topProjects(take: $limit, skip: $skip, orderBy: $orderBy) {
      projects {
        id
        title
        balance
        image
        slug
        creationDate
        admin
        walletAddress
        reaction {
          id
        }
        totalReactions
        categories {
          name
        }
      }
      totalCount
    }
  }
`;

// @ts-expect-error migrate to ESM
const FETCH_PROJECT = gql`
  query Project($id: ID!) {
    project(id: $id) {
      id
      admin
      title
      description
      image
      slug
      creationDate
      walletAddress
      categories {
        name
      }
    }
  }
`;

// @ts-expect-error migrate to ESM
const FETCH_PROJECT_BY_SLUG = gql`
  query ProjectBySlug($slug: String!) {
    projectBySlug(slug: $slug) {
      id
      title
      description
      image
      slug
      creationDate
      admin
      walletAddress
      categories {
        name
      }
    }
  }
`;

// @ts-expect-error migrate to ESM
const ADD_BANK_ACCOUNT = gql`
  mutation AddBankAccount($id: ID!) {
    addBankAccount(projectId: $id, source: "") {
      id
      projectId
    }
  }
`;

// @ts-expect-error migrate to ESM
const GET_LINK_BANK_CREATION = gql`
  query SetProjectBankAccount(
    $projectId: Float!
    $returnUrl: String!
    $refreshUrl: String!
  ) {
    setProjectBankAccount(
      projectId: $projectId
      returnUrl: $returnUrl
      refreshUrl: $refreshUrl
    )
  }
`;
// @ts-expect-error as d
const GET_DONATION_SESSION = gql`
  query GetStripeProjectDonationSession(
    $projectId: Float!
    $amount: Float!
    $anonymous: Boolean!
    $donateToGiveth: Boolean!
    $successUrl: String!
    $cancelUrl: String!
  ) {
    getStripeProjectDonationSession(
      projectId: $projectId
      amount: $amount
      anonymous: $anonymous
      donateToGiveth: $donateToGiveth
      successUrl: $successUrl
      cancelUrl: $cancelUrl
    ) {
      sessionId
      accountId
    }
  }
`;

// const GET_STRIPE_DONATION_PDF = gql`
//   query GetStripeDonationPDF($sessionId: Float!) {
//     getStripeDonationPDF(sessionId: $sessionId)
//   }
// `

// @ts-expect-error as d
const GET_STRIPE_DONATION_PDF = gql`
  query GetStripeDonationPDF($sessionId: Float!) {
    getStripeDonationPDF(sessionId: $sessionId) {
      pdf
      data {
        id
        createdAt
        donor
        projectName
        status
        amount
        currency
        donorName
        donorEmail
        projectDonation
        givethDonation
        processingFee
      }
    }
  }
`;

// const GET_STRIPE_PROJECT_DONATIONS = gql`
//   query GetStripeDonations($projectId: Float!) {
//     getStripeProjectDonations(projectId: $projectId) {
//       id
//       amount
//       donor
//       currency
//       status
//       createdAt
//     }
//   }
// `

// @ts-expect-error as d
const GET_STRIPE_PROJECT_DONATIONS = gql`
  query GetStripeDonations($projectId: Float!) {
    getStripeProjectDonations(projectId: $projectId) {
      donations {
        id
        amount
        donor
        currency
        status
      }
      totalDonors
    }
  }
`;
// @ts-expect-error as d
const ADD_PROJECT = gql`
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
      categories {
        name
      }
    }
  }
`;
/*
 ** PROJECT UPDATES
 */
// @ts-expect-error as d
const ADD_PROJECT_UPDATE = gql`
  mutation ($projectId: Float!, $title: String!, $content: String!) {
    addProjectUpdate(projectId: $projectId, title: $title, content: $content) {
      id
      projectId
      userId
      content
    }
  }
`;

// @ts-expect-error as d
const GET_PROJECT_UPDATES = gql`
  query GetProjectUpdates(
    $projectId: Float!
    $take: Float!
    $skip: Float!
    $orderBy: OrderBy
  ) {
    getProjectUpdates(
      projectId: $projectId
      take: $take
      skip: $skip
      orderBy: $orderBy
    ) {
      projectUpdate {
        id
        title
        content
        createdAt
        projectId
        userId
      }
      reactions {
        reaction
        userId
      }
    }
  }
`;

export {
  FETCH_PROJECTS,
  FETCH_PROJECT,
  FETCH_PROJECT_BY_SLUG,
  ADD_PROJECT,
  ADD_BANK_ACCOUNT,
  GET_LINK_BANK_CREATION,
  GET_DONATION_SESSION,
  GET_STRIPE_DONATION_PDF,
  GET_STRIPE_PROJECT_DONATIONS,
  ADD_PROJECT_UPDATE,
  GET_PROJECT_UPDATES,
};
