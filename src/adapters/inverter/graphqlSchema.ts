// create schemas based on these types: https://github.com/InverterNetwork/indexer/blob/main/schema.graphql
// playground: https://envio.dev/app/inverternetwork/indexer/1b0fc71/playground

export const getBondingCurveByIDQuery = `query GetBondingCurveByID($id: String!) {
    BondingCurve_by_pk(id: $id) {
        id
        chainId
        collateralToken
        collateralTokenDecimals
        buyFee
        sellFee
        bcType
        virtualCollateral
        virtualCollateralRaw
        virtualIssuance
        buyReserveRatio
        sellReserveRatio
        issuanceToken
        issuanceTokenDecimals
        swaps {
            id
            swapType
            issuanceAmount
            collateralAmount
            priceInCol
            initiator
            recipient
            blockTimestamp
            chainId
        }
        workflow {
            id
            orchestratorId
            fundingManager {
                id
                chainId
                orchestrator
                moduleType {
                    id
                    url
                    name
                    beacon
                }
            }
        }
    }
}`;

export const getTokenTotalSupplyByAddress = `
    query GetTokenTotalSupplyByAddress($tokenAddress: String!) {
      BondingCurve(where: {issuanceToken: {_eq: $tokenAddress}}){
        virtualIssuance
        id
      }
    }
`;

export const getWorkFlowByAddress = `
  query GetWorkFlowByID($id: String!) {
    Workflow(where: {id: {_eq: $id}}) {
      chainId
      orchestratorId
      optionalModules
      id
      paymentProcessor_id
      paymentProcessor {
        chainId
        id
        moduleType_id
        orchestrator
        moduleType {
          beacon
          chainId
          id
          majorVersion
          minorVersion
          name
          patchVersion
          url
        }
      }
    }
  }
`;

export const getRewardInfoByOrchestratorAddressAndDonerAddress = `
  query getStreamingPaymentProcessorByAddressAndDonerAddress($orchestratorAddress: String!, $donerAddress: String!) {
    StreamingPaymentProcessor(where: {workflow_id: {_eq: $orchestratorAddress}}) {
      chainId
      id
      vestings(where: {recipient: {_eq: $donerAddress}}) {
        amountRaw
        blockTimestamp
        chainId
        cliff
        end
        id
        recipient
        start
        status
        token
      }
    }
  }
`;

export const getRewardInfoByOrchestratorAddress = `
  query getStreamingPaymentProcessorByAdderss($orchestratorAddress: String!) {
    StreamingPaymentProcessor(where: {workflow_id: {_eq: $orchestratorAddress}}) {
      chainId
      id
      vestings {
        amountRaw
        blockTimestamp
        chainId
        cliff
        db_write_timestamp
        end
        id
        recipient
        start
        status
        streamingPaymentProcessor_id
        token
      }
      workflow_id
    }
  }
`;
