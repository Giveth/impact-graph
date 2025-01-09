import {
  CocmAdapterInterface,
  ProjectsEstimatedMatchings,
} from './cocmAdapterInterface';

export class CocmMockAdapter implements CocmAdapterInterface {
  async fetchEstimatedClusterMatchings(
    _matchingDataInput,
  ): Promise<ProjectsEstimatedMatchings> {
    return {
      matching_data: [
        {
          matching_amount: 83.25,
          matching_percent: 50.0,
          project_name: 'Test1',
          strategy: 'COCM',
        },
        {
          matching_amount: 83.25,
          matching_percent: 50.0,
          project_name: 'Test3',
          strategy: 'COCM',
        },
      ],
    };
  }
}
