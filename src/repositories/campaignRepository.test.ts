import { assert } from 'chai';
import { Campaign, CampaignType } from '../entities/campaign.js';
import {
  findAllActiveCampaigns,
  findCampaignBySlug,
  findFeaturedCampaign,
} from './campaignRepository.js';
import { findProjectById } from './projectRepository.js';
import { SEED_DATA } from '../../test/testUtils.js';
import { Project } from '../entities/project.js';
import { generateRandomString } from '../utils/utils.js';

describe('findAllActiveCampaigns test cases', findAllActiveCampaignsTestCases);
describe('findCampaignBySlug test cases', findCampaignBySlugTestCases);
describe('findFeaturedCampaign test cases', findFeaturedCampaignTestCases);

function findAllActiveCampaignsTestCases() {
  it('should return active campaigns', async () => {
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

    const campaign2 = await Campaign.create({
      isActive: false,
      slug: generateRandomString(),
      title: 'title2',
      description: 'description2',
      type: CampaignType.ManuallySelected,
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      photo: 'https://google.com',
      order: 3,
    }).save();

    const activeCampaigns = await findAllActiveCampaigns();
    activeCampaigns.forEach(campaign => assert.isTrue(campaign.isActive));
    activeCampaigns.forEach(campaign =>
      assert.isOk(
        campaign?.relatedProjectsSlugs[0],
        SEED_DATA.FIRST_PROJECT.slug,
      ),
    );
    await campaign1.remove();
    await campaign2.remove();
  });
}

function findCampaignBySlugTestCases() {
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
      relatedProjects: [
        (await findProjectById(SEED_DATA.FIRST_PROJECT.id)) as Project,
      ],
      order: 2,
    }).save();

    const foundCampaign = await findCampaignBySlug(slug);
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
      relatedProjects: [
        (await findProjectById(SEED_DATA.FIRST_PROJECT.id)) as Project,
      ],
      order: 2,
    }).save();

    const foundCampaign = await findCampaignBySlug(slug);
    assert.isNull(foundCampaign);
    await campaign1.remove();
  });
  it('Should return null if there is no campaign with that slug', async () => {
    const foundCampaign = await findCampaignBySlug(generateRandomString());
    assert.isNull(foundCampaign);
  });
}

function findFeaturedCampaignTestCases() {
  it('Should find featured campaign', async () => {
    const campaign1 = await Campaign.create({
      isActive: true,
      isFeatured: true,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      type: CampaignType.ManuallySelected,
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      relatedProjects: [
        (await findProjectById(SEED_DATA.FIRST_PROJECT.id)) as Project,
      ],
      order: 2,
    }).save();
    const campaign2 = await Campaign.create({
      isActive: true,
      isFeatured: true,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      type: CampaignType.ManuallySelected,
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      relatedProjects: [
        (await findProjectById(SEED_DATA.FIRST_PROJECT.id)) as Project,
      ],
      order: 2,
    }).save();

    const foundCampaign = await findFeaturedCampaign();
    assert.isTrue(foundCampaign?.isFeatured);
    await campaign1.remove();
    await campaign2.remove();
  });
  it('Should return null if featured campaign is not active', async () => {
    const campaign1 = await Campaign.create({
      isActive: false,
      isFeatured: false,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      type: CampaignType.ManuallySelected,
      relatedProjectsSlugs: [SEED_DATA.FIRST_PROJECT.slug],
      relatedProjects: [
        (await findProjectById(SEED_DATA.FIRST_PROJECT.id)) as Project,
      ],
      order: 2,
    }).save();

    const foundCampaign = await findFeaturedCampaign();
    assert.isNull(foundCampaign);
    await campaign1.remove();
  });
  it('Should return null if there is no featured campaign', async () => {
    const foundCampaign = await findCampaignBySlug(generateRandomString());
    assert.isNull(foundCampaign);
  });
}
