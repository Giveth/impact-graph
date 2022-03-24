import { schedule } from 'node-cron';
import { Project, ProjStatus, ProjectUpdate } from '../../entities/project';
import { Category } from '../../entities/category';
import { sleep } from '../../utils/utils';
import {
  loginGivingBlocks,
  fetchGivingBlockProjects,
  generateGivingBlockDepositAddress,
  fetchOrganizationById,
  GivingBlockProject,
} from './api';
import {
  validateProjectTitle,
  validateProjectWalletAddress,
} from '../../utils/validators/projectValidator';
import config from '../../config';
import slugify from 'slugify';
import { ProjectStatus } from '../../entities/projectStatus';
import { logger } from '../../utils/logger';
import { getAppropriateSlug, getQualityScore } from '../projectService';
import { Organization, ORGANIZATION_LABELS } from '../../entities/organization';

const givingBlockCategoryName = 'The Giving Block';
const givingBlockHandle = 'the-giving-block';

// Every week once on sunday at 0 hours
const cronJobTime =
  (config.get('SYNC_GIVING_BLOCKS_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * 0';

// Admin Account assigned by Giveth to handle this projects
const adminId =
  (config.get('THIRD_PARTY_PROJECTS_ADMIN_USER_ID') as string) || '1';

export const runGivingBlocksProjectSynchronization = () => {
  logger.debug('runGivingBlocksProjectSynchronization() has been called');
  schedule(cronJobTime, async () => {
    await exportGivingBlocksProjects();
  });
};

const exportGivingBlocksProjects = async () => {
  const authResponse = await loginGivingBlocks();
  const accessToken = authResponse.accessToken;

  const activeStatus = await ProjectStatus.findOne({ id: ProjStatus.active });
  const organization = await Organization.findOne({
    label: ORGANIZATION_LABELS.GIVING_BLOCK,
  });

  const givingBlocksProjects = await fetchGivingBlockProjects(accessToken);
  const givingBlocksCategory = await findOrCreateGivingBlocksCategory();

  for (const givingBlockProject of givingBlocksProjects) {
    await createGivingProject({
      accessToken,
      givingBlockProject,
      givingBlocksCategory,
      organization,
      activeStatus,
    });
  }
};

const createGivingProject = async (data: {
  accessToken: string;
  givingBlockProject: GivingBlockProject;
  givingBlocksCategory: GivingBlocksCategory;
  organization?: Organization;
  activeStatus?: ProjectStatus;
}) => {
  const {
    accessToken,
    givingBlockProject,
    givingBlocksCategory,
    activeStatus,
  } = data;
  try {
    if (givingBlockProject.allowsAnon === false) return;

    const givethProject = await Project.findOne({
      givingBlocksId: String(givingBlockProject.id),
    });
    if (givethProject) {
      logger.debug(`GivingBlocksProject ${givingBlockProject.id}. Exists`);
      return;
    }
    logger.debug(`GivingBlocksProject ${givingBlockProject.id}. is not exists`);

    const walletAddress = await generateGivingBlockDepositAddress(
      accessToken,
      givingBlockProject.id,
    );

    const organization = await fetchOrganizationById(
      accessToken,
      givingBlockProject.id,
    );

    // Await enough for full limit to regenerate
    await sleep(1000);

    const description = organization?.websiteBlocks?.missionStatement?.value;
    const youtube = organization?.websiteBlocks?.youtubeUrl?.value;
    const website = organization?.websiteBlocks?.url?.value;

    // Remove special characters including ,
    const slugBase = slugify(givingBlockProject.name, {
      remove: /[*+~.,()'"!:@]/g,
    });
    const slug = await getAppropriateSlug(slugBase);
    const qualityScore = getQualityScore(
      description,
      Boolean(givingBlockProject.logo),
    );

    const project = Project.create({
      title: givingBlockProject.name,
      description,
      organization,
      categories: [givingBlocksCategory],
      walletAddress,
      creationDate: new Date(),
      slug,
      youtube,
      website,
      image: givingBlockProject.logo,
      slugHistory: [],
      givingBlocksId: String(givingBlockProject.id),
      admin: adminId,
      status: activeStatus,
      qualityScore,
      totalDonations: 0,
      totalReactions: 0,
      totalProjectUpdates: 0,
      listed: true,
      verified: true,
      giveBacks: true,
      isImported: true,
    });
    await project.save();
    logger.debug(
      'This giving blocks project has been created in our db givingBlocksId',
      givingBlockProject.id,
    );

    // create default projectUpdate to allow adding Reactions
    const update = ProjectUpdate.create({
      userId: Number(adminId),
      projectId: project.id,
      content: '',
      title: '',
      createdAt: new Date(),
      isMain: true,
    });

    await ProjectUpdate.save(update);
  } catch (e) {
    // Log Error but keep going with the rest of the projects
    logger.error('createGivingProject error', e);
  }
};

// The GivingBlocks itself will be the category
// To avoid extra logic bringing external ones.
type GivingBlocksCategory = {
  id: number;
  name: string;
};

const findOrCreateGivingBlocksCategory = async (): Promise<Category> => {
  let category = await Category.findOne({ name: givingBlockHandle });

  if (!category) {
    category = new Category();
    category.name = givingBlockHandle;
    category.value = givingBlockCategoryName;
    await category.save();
  }

  return category;
};
