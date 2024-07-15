import axios from 'axios';
import { assert } from 'chai';
import {
  createProjectData,
  graphqlUrl,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils.js';
import {
  fetchCampaignBySlug,
  getCampaigns,
} from '../../test/graphqlQueries.js';
import {
  Campaign,
  CampaignFilterField,
  CampaignType,
} from '../entities/campaign.js';
import { generateRandomString } from '../utils/utils.js';

describe('Fetch campaigns test cases', fetchCampaignsTestCases);
describe('Fetch campaignBySlug test cases', fetchCampaignBySlugTestCases);

function fetchCampaignBySlugTestCases() {
  it('Should find campaign by slug', async () => {
    const slug = generateRandomString();
    const campaign1 = await Campaign.create({
      isActive: true,
      slug,
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      type: CampaignType.ManuallySelected,
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      order: 2,
    }).save();

    const campaignBySlugResponse = await axios.post(graphqlUrl, {
      query: fetchCampaignBySlug,
      variables: {
        slug,
      },
    });

    const foundCampaign = campaignBySlugResponse.data.data.findCampaignBySlug;
    assert.equal(foundCampaign?.slug, slug);
    assert.equal(foundCampaign?.id, campaign1.id);
    await campaign1.remove();
  });
  it('Should return null if campaign is not active', async () => {
    const slug = generateRandomString();
    const campaign1 = await Campaign.create({
      isActive: false,
      slug,
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      type: CampaignType.ManuallySelected,
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      order: 2,
    }).save();

    const campaignBySlugResponse = await axios.post(graphqlUrl, {
      query: fetchCampaignBySlug,
      variables: {
        slug,
      },
    });

    const foundCampaign = campaignBySlugResponse.data.data.findCampaignBySlug;
    assert.isNull(foundCampaign);
    await campaign1.remove();
  });

  it('Should return featured campaign if not sending slug', async () => {
    const campaign1 = await Campaign.create({
      isActive: true,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      type: CampaignType.ManuallySelected,
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      order: 2,
    }).save();

    const featuredCampaign = await Campaign.create({
      isActive: true,
      isFeatured: true,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      type: CampaignType.ManuallySelected,
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      order: 2,
    }).save();

    const campaignBySlugResponse = await axios.post(graphqlUrl, {
      query: fetchCampaignBySlug,
      variables: {},
    });
    const foundCampaign = campaignBySlugResponse.data.data.findCampaignBySlug;
    assert.equal(featuredCampaign.id, foundCampaign.id);
    await campaign1.remove();
    await featuredCampaign.remove();
  });

  it('Should return null if there is no campaign with that slug', async () => {
    const campaignBySlugResponse = await axios.post(graphqlUrl, {
      query: fetchCampaignBySlug,
      variables: {
        slug: generateRandomString(),
      },
    });

    const foundCampaign = campaignBySlugResponse.data.data.findCampaignBySlug;
    assert.isNull(foundCampaign);
  });
}

function fetchCampaignsTestCases() {
  it('should return active campaigns', async () => {
    const campaign1 = await Campaign.create({
      isActive: true,
      type: CampaignType.ManuallySelected,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      order: 1,
    }).save();

    const campaign2 = await Campaign.create({
      isActive: true,
      slug: generateRandomString(),
      title: 'title1',
      type: CampaignType.FilterFields,
      description: 'description1',
      photo: 'https://google.com',
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
      type: CampaignType.ManuallySelected,
      description: 'description2',
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      photo: 'https://google.com',
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
  it('should return active campaigns, related projects should be sorted as admin selected', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const project3 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const project4 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const slugArray = [
      project1.slug as string,
      project4.slug as string,
      project2.slug as string,
      project3.slug as string,
    ];

    const campaign = await Campaign.create({
      isActive: true,
      type: CampaignType.ManuallySelected,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      relatedProjectsSlugs: slugArray,
      order: 1,
    }).save();

    const campaignsResponse = await axios.post(graphqlUrl, {
      query: getCampaigns,
      variables: {},
    });
    const result = campaignsResponse.data.data.campaigns;
    assert.equal(result.length, 1);
    assert.equal(result[0].relatedProjects[0].slug, slugArray[0]);
    assert.equal(result[0].relatedProjects[1].slug, slugArray[1]);
    assert.equal(result[0].relatedProjects[2].slug, slugArray[2]);
    assert.equal(result[0].relatedProjects[3].slug, slugArray[3]);

    await campaign.remove();
  });
}
