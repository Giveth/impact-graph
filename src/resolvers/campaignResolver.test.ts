import axios from 'axios';
import { graphqlUrl, SEED_DATA } from '../../test/testUtils';
import { getCampaigns } from '../../test/graphqlQueries';
import { assert } from 'chai';
import {
  Campaign,
  CampaignFilterField,
  CampaignType,
} from '../entities/campaign';
import { findProjectById } from '../repositories/projectRepository';
import { Project } from '../entities/project';
import { generateRandomString } from '../utils/utils';

describe('Fetch campaigns test cases', fetchCampaignsTestCases);

function fetchCampaignsTestCases() {
  it('should return active campaigns', async () => {
    const campaign1 = await Campaign.create({
      isActive: true,
      type: CampaignType.RelatedProjects,
      slug: generateRandomString(),
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
      slug: generateRandomString(),
      title: 'title1',
      type: CampaignType.FilterFields,
      description: 'description1',
      media: 'https://google.com',
      filterFields: [
        CampaignFilterField.givingBlocksId,
        CampaignFilterField.acceptFundOnGnosis,
      ],
      order: 2,
    }).save();

    const campaign3 = await Campaign.create({
      isActive: false,
      slug: generateRandomString(),
      title: 'title2',
      type: CampaignType.RelatedProjects,
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
