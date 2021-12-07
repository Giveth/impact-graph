import { schedule } from 'node-cron';
import { Project, ProjStatus } from '../../entities/project';
import { ProjectStatus } from '../../entities/projectStatus';
import { Category } from '../../entities/category';
import {
  loginGivingBlocks,
  fetchGivingBlockProjects,
  generateGivingBlockDepositAddress,
  organizationById,
  GivingBlockProject,
} from './api';
import {
  validateProjectTitle,
  validateProjectWalletAddress,
} from '../../utils/validators/projectValidator';
import config from '../../config';
import slugify from 'slugify';

// Every week once on sunday at 0 hours
const cronJobTime =
  (config.get('SYNC_GIVING_BLOCKS_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * 0';

// Admin Account assigned by Giveth to handle this projects
const adminId = (config.get('GIVING_BLOCKS_ADMIN_USER_ID') as string) || '1';

export const runGivingBlocksProjectSynchronization = () => {
  console.log('runGivingBlocksProjectSynchronization() has been called');
  schedule(cronJobTime, async () => {
    await exportGivingBlocksProjects();
  });
};

const exportGivingBlocksProjects = async () => {
  const authResponse = await loginGivingBlocks();
  const accessToken = authResponse.accessToken;

  const givingBlocksProjects = await fetchGivingBlockProjects(accessToken);

  for (const givingBlockProject of givingBlocksProjects) {
    await createGivingProject({ accessToken, givingBlockProject });
  }
};

const createGivingProject = async (data: {
  accessToken: string;
  givingBlockProject: GivingBlockProject;
}) => {
  const { accessToken, givingBlockProject } = data;
  try {
    // seems to break with internal server error on multiple calls
    const walletAddress = await generateGivingBlockDepositAddress(
      accessToken,
      givingBlockProject.id,
    );
    // DISCUSS IN DEV CALL how to handle multiple currencies? we only have 1 address per project

    // Need to hit the API again to get website html strings
    const organizationByIdResponse = await organizationById(
      accessToken,
      givingBlockProject.id,
    );
    const categories =
      organizationByIdResponse.data.data.organization.categories;
    const description =
      organizationByIdResponse.data.data.organization?.websiteBlocks
        ?.missionStatement?.value;
    const youtube =
      organizationByIdResponse.data.data.organization?.websiteBlocks?.youtubeUrl
        ?.value;
    const website =
      organizationByIdResponse.data.data.organization?.websiteBlocks?.url
        ?.value;

    // Our Current Validations
    await validateProjectWalletAddress(walletAddress as string);
    await validateProjectTitle(givingBlockProject.name);
    const slugBase = slugify(givingBlockProject.name);
    const slug = await getAppropriateSlug(slugBase);
    const qualityScore = getQualityScore(
      description,
      Boolean(givingBlockProject.logo),
    );

    // Find or create giving blocks categories
    const dbCategories = await findOrCreateCategories(categories);

    const project = Project.create({
      title: givingBlockProject.name,
      description,
      categories: dbCategories,
      walletAddress,
      creationDate: new Date(),
      slug,
      youtube,
      website,
      slugHistory: [],
      givingBlocksId: String(givingBlockProject.id),
      admin: adminId,
      statusId: ProjStatus.active,
      qualityScore,
      totalDonations: 0,
      totalReactions: 0,
      totalProjectUpdates: 0,
      verified: true,
      giveBacks: true,
    });

    await project.save();
  } catch (e) {
    // Log Error but keep going with the rest of the projects
    console.log(e);
  }
};

// Current Formula: This will be changed in the future
const getQualityScore = (description, hasImageUpload) => {
  let qualityScore = 40;

  if (description.length > 100) qualityScore = qualityScore + 10;
  if (hasImageUpload) qualityScore = qualityScore + 30;

  return qualityScore;
};

const getAppropriateSlug = async (slugBase: string) => {
  let slug = slugBase.toLowerCase();
  const projectCount = await Project.createQueryBuilder('project')
    // check current slug and previous slugs
    .where(`:slug = ANY(project."slugHistory") or project.slug = :slug`, {
      slug,
    })
    .getCount();

  if (projectCount > 0) {
    slug = slugBase + '-' + (projectCount - 1);
  }
  return slug;
};

// Are we creating giving blocks categories on our DB?
type GivingBlocksCategory = {
  id: number;
  name: string;
};

const findOrCreateCategories = async (categories: [GivingBlocksCategory]) => {
  const currentCategories = await Promise.all(
    categories.map(async category => {
      let [c] = await Category.find({ givingBlocksId: category.id });
      if (c === undefined) {
        c = new Category();
        c.givingBlocksId = category.id;
        c.name = category.name;
      }
      return c;
    }),
  );

  return currentCategories;
};
