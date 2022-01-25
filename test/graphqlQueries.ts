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
