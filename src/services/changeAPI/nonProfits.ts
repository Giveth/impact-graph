import Axios, { AxiosResponse } from 'axios';
import slugify from 'slugify';
import config from '../../config';
import { Organization, ORGANIZATION_LABELS } from '../../entities/organization';
import {
  Category,
  Project,
  ProjectUpdate,
  ProjStatus,
} from '../../entities/project';
import { ProjectStatus } from '../../entities/projectStatus';
import { errorMessages } from '../../utils/errorMessages';
import { logger } from '../../utils/logger';
import { getAppropriateSlug, getQualityScore } from '../projectService';

const changeAPICategoryName = 'Change';
const changeAPIHandle = 'change';

const changeApiNonProfitUrl = config.get(
  'CHANGE_API_NON_PROFITS_SEARCH_URL',
) as string;

// Admin Account assigned by Giveth to handle this projects
const adminId =
  (config.get('THIRD_PARTY_PROJECTS_ADMIN_USER_ID') as string) || '1';

interface ChangeNonProfit {
  address_line?: string;
  category?: string;
  city?: string;
  classification?: string;
  crypto: {
    ethereum_address: string;
    solana_address?: string;
  };
  ein: string;
  icon_url?: string;
  cover_image_url?: string;
  id: string;
  mission: string;
  name: string;
  socials: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  state?: string;
  website?: string;
  zip_code?: string;
}

// exact title returns 1 element
export const getChangeNonProfitByNameOrIEN = async (
  nonProfit: String,
): Promise<ChangeNonProfit> => {
  try {
    const result = await Axios.get(changeApiNonProfitUrl, {
      params: {
        public_key: config.get('CHANGE_API_KEYS') as string,
        search_term: nonProfit,
      },
    });

    const nonProfits = result.data.nonprofits;
    if (nonProfits.length > 1)
      throw errorMessages.CHANGE_API_TITLE_OR_EIN_NOT_PRECISE;

    if (nonProfits.length === 0)
      throw errorMessages.CHANGE_API_INVALID_TITLE_OR_EIN;

    return nonProfits[0];
  } catch (e) {
    logger.error('changeAPI service err', e);
    throw e;
  }
};

export const createProjectFromChangeNonProfit = async (
  nonProfit: ChangeNonProfit,
): Promise<Project> => {
  try {
    const changeCategory = await findOrCreateChangeAPICategory();
    const activeStatus = await ProjectStatus.findOne({ id: ProjStatus.active });
    const organization = await Organization.findOne({
      label: ORGANIZATION_LABELS.CHANGE,
    });

    const slugBase = slugify(nonProfit.name, {
      remove: /[*+~.,()'"!:@]/g,
    });
    const slug = await getAppropriateSlug(slugBase);

    const image = nonProfit?.cover_image_url || nonProfit?.icon_url;

    const qualityScore = getQualityScore(nonProfit.mission, Boolean(image));

    const project = Project.create({
      title: nonProfit.name,
      organization,
      description: nonProfit.mission,
      categories: [changeCategory],
      walletAddress: nonProfit.crypto.ethereum_address,
      creationDate: new Date(),
      slug,
      youtube: nonProfit.socials.youtube,
      website: nonProfit.website,
      image,
      slugHistory: [],
      changeId: String(nonProfit.id),
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
      'This changeAPI project has been created in our db with ID:',
      project.id,
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

    return project;
  } catch (e) {
    logger.error('createChangeAPIProject error', e);
    throw e;
  }
};

const findOrCreateChangeAPICategory = async (): Promise<Category> => {
  let category = await Category.findOne({ name: changeAPIHandle });

  if (!category) {
    category = new Category();
    category.name = changeAPIHandle;
    category.value = changeAPICategoryName;
    await category.save();
  }

  return category;
};
