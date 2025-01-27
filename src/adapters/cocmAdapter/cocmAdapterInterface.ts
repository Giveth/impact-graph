// Example Data
// {
// 	"matching_data": [
// 		{
// 			"matching_amount": 83.25,
// 			"matching_percent": 50.0,
// 			"project_name": "Test1",
// 			"strategy": "COCM"
// 		},
// 		{
// 			"matching_amount": 83.25,
// 			"matching_percent": 50.0,
// 			"project_name": "Test3",
// 			"strategy": "COCM"
// 		}
// 	]
// }

export interface ProjectsEstimatedMatchings {
  matching_data: {
    matching_amount: number;
    matching_percent: number;
    project_name: string;
    strategy: string;
  }[];
}

export interface EstimatedMatchingInput {
  votes_data: [
    {
      voter: string;
      payoutAddress: string;
      amountUSD: number;
      project_name: string;
      score: number;
    },
  ];
  strategy: string;
  min_donation_threshold_amount: number;
  matching_cap_amount: number;
  matching_amount: number;
  passport_threshold: number;
}

export interface CocmAdapterInterface {
  fetchEstimatedClusterMatchings(
    matchingDataInput: EstimatedMatchingInput,
  ): Promise<ProjectsEstimatedMatchings>;
}
