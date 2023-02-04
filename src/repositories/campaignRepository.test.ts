import { Campaign } from '../entities/campaign';
import { findAllActiveCampaigns } from './campaignRepository';
import { assert } from 'chai';
import { findProjectById } from './projectRepository';
import { SEED_DATA } from '../../test/testUtils';
import { Project } from '../entities/project';

describe('findAllActiveCampaigns test cases', findAllActiveCampaignsTestCases);

function findAllActiveCampaignsTestCases() {
  it('should return active campaigns', async () => {
    await Campaign.create({
      isActive: true,
      name: 'name1',
      title: 'title1',
      description: 'description1',
      media: 'https://google.com',
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      relatedProjects: [
        (await findProjectById(SEED_DATA.FIRST_PROJECT.id)) as Project,
      ],
      order: 2,
    }).save();

    await Campaign.create({
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

    const activeCampaigns = await findAllActiveCampaigns();
    activeCampaigns.forEach(campaign => assert.isTrue(campaign.isActive));
    activeCampaigns.forEach(campaign =>
      assert.isOk(campaign?.relatedProjects[0].slug),
    );
  });
}
