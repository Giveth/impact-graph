import axios from 'axios';
import { graphqlUrl, SEED_DATA } from '../../test/testUtils';
import { getCampaigns } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { Campaign, CampaignFilterField } from '../entities/campaign';
import { findProjectById } from '../repositories/projectRepository';
import { Project } from '../entities/project';

describe('Fetch campaigns test cases', fetchCampaignsTestCases);

function fetchCampaignsTestCases() {
  it('should return active categories', async () => {
    const campaign1 = await Campaign.create({
      isActive: true,
      name: 'name1',
      title: 'title1',
      description: 'description1',
      media: 'https://google.com',
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      relatedProjects: [
        (await findProjectById(SEED_DATA.FIRST_PROJECT.id)) as Project,
      ],
      order: 1,
    }).save();

    const campaign2 = await Campaign.create({
      isActive: true,
      name: 'name1',
      title: 'title1',
      description: 'description1',
      media: 'https://google.com',
      filterFields: [
        CampaignFilterField.AcceptGiv,
        CampaignFilterField.AcceptFundOnGnosis,
      ],
      order: 2,
    }).save();

    const campaign3 = await Campaign.create({
      isActive: false,
      name: 'name2',
      title: 'title2',
      description: 'description2',
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      relatedProjects: [
        (await findProjectById(SEED_DATA.FIRST_PROJECT.id)) as Project,
      ],
      media: 'https://google.com',
      order: 3,
    }).save();

    const campaignsResponse = await axios.post(graphqlUrl, {
      query: getCampaigns,
      variables: {},
    });
    const result = campaignsResponse.data.data.campaigns;
    assert.equal(result.length, 2);
    assert.equal(result[0].order, 1);
    assert.equal(result[1].order, 2);
    assert.equal(result[1].filterFields.length, 2);

    await campaign1.remove();
    await campaign2.remove();
    await campaign3.remove();
  });
}
