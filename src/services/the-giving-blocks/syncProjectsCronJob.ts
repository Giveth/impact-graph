import { schedule } from 'node-cron';
import slugify from 'slugify';
import {
  Project,
  ProjStatus,
  ProjectUpdate,
  ReviewStatus,
} from '../../entities/project.js';
import { Category, CATEGORY_NAMES } from '../../entities/category.js';
import { sleep } from '../../utils/utils.js';
import {
  loginGivingBlocks,
  fetchGivingBlockProjects,
  generateGivingBlockDepositAddress,
  fetchOrganizationById,
  GivingBlockProject,
} from './api.js';
import config from '../../config.js';
import { ProjectStatus } from '../../entities/projectStatus.js';
import { logger } from '../../utils/logger.js';
import { getAppropriateSlug, getQualityScore } from '../projectService.js';
import {
  Organization,
  ORGANIZATION_LABELS,
} from '../../entities/organization.js';
import { findUserById } from '../../repositories/userRepository.js';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../utils/errorMessages.js';

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

  const activeStatus = await ProjectStatus.findOne({
    where: { id: ProjStatus.active },
  });
  const organization = await Organization.findOne({
    where: {
      label: ORGANIZATION_LABELS.GIVING_BLOCK,
    },
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
  organization: Organization | null;
  activeStatus: ProjectStatus | null;
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
      where: {
        givingBlocksId: String(givingBlockProject.id),
      },
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
    const adminUser = await findUserById(Number(adminId));

    // Await enough for full limit to regenerate
    await sleep(1000);

    const description = organization?.websiteBlocks?.missionStatement?.value;
    const youtube = organization?.websiteBlocks?.youtubeUrl?.value;
    const website = organization?.websiteBlocks?.url?.value;

    // Remove special characters including ,
    // @ts-expect-error old package
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
      statusId: activeStatus?.id,
      qualityScore,
      totalDonations: 0,
      totalReactions: 0,
      totalProjectUpdates: 0,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
      verified: true,
      giveBacks: true,
      isImported: true,
      adminUserId: adminUser?.id,
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
  const category = await Category.findOne({
    where: { name: CATEGORY_NAMES.registeredNonProfits },
  });

  if (!category) {
    logger.error(
      i18n.__(
        translationErrorMessagesKeys.REGISTERED_NON_PROFITS_CATEGORY_DOESNT_EXIST,
      ),
    );
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.REGISTERED_NON_PROFITS_CATEGORY_DOESNT_EXIST,
      ),
    );
  }

  return category;
};
