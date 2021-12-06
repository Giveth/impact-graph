import { schedule } from 'node-cron';
import { Project, ProjStatus } from '../../entities/project';
import { ProjectStatus } from '../../entities/projectStatus';
import { Category } from '../../entities/category';
import { login, organizations, depositAddress, organizationById } from './api';
import { validateProjectTitle, validateProjectWalletAddress } from '../../utils/validators/projectValidator';
import config from '../../config';
import slugify from 'slugify';

// Every week once on sunday at 0 hours
const cronJobTime =
    (config.get('SYNC_GIVING_BLOCKS_CRONJOB_EXPRESSION') as string) ||
    '0 0 * * 0';

// Admin Account assigned by Giveth to handle this projects
const adminId = (config.get('GIVING_BLOCKS_ADMIN_USER_ID') as string) || '1'

export const runGivingBlocksProjectSynchronization = () => {
    console.log('runGivingBlocksProjectSynchronization() has been called');
    schedule(cronJobTime, async () => {
        await exportGivingBlocksProjects();
    });
}

const exportGivingBlocksProjects = async () => {
    const authResponse = await login();
    const accessToken = authResponse.data.data.accessToken;

    const organizationResponse = await organizations(accessToken);
    const givingBlocksProjects = organizationResponse.data.data.organizations;

    for (const givingBlockProject of givingBlocksProjects) {
        try {
            // seems to break with internal server error on multiple calls
            const addressResponse = await depositAddress(accessToken, givingBlockProject.id);
            // DISCUSS IN DEV CALL how to handle multiple currencies? we only have 1 address per project
            const walletAddress = addressResponse.data.data.depositAddress;

            // Need to hit the API again to get website html strings
            const organizationByIdResponse = await organizationById(accessToken, givingBlockProject.id);
            const categories = organizationByIdResponse.data.data.organization.categories;
            const description = organizationByIdResponse.data.data.organization?.websiteBlocks?.missionStatement?.value;
            const youtube = organizationByIdResponse.data.data.organization?.websiteBlocks?.youtubeUrl?.value;
            const website = organizationByIdResponse.data.data.organization?.websiteBlocks?.url?.value;

            // Our Current Validations
            await validateProjectWalletAddress(walletAddress as string);
            await validateProjectTitle(givingBlockProject.name);
            const slugBase = slugify(givingBlockProject.name);
            const slug = await getAppropriateSlug(slugBase);
            const status = await ProjectStatus.findOne({ id: ProjStatus.active });
            const qualityScore = getQualityScore(description, !!givingBlockProject.logo);

            // Find or create giving blocks categories
            const dbCategories = await findOrCreateCategories(categories);

            const project = Project.create({
                title: givingBlockProject.name,
                description,
                categories: dbCategories,
                walletAddress: walletAddress,
                creationDate: new Date(),
                slug,
                youtube,
                website,
                slugHistory: [],
                givingBlocksId: givingBlockProject.id,
                admin: adminId,
                statusId: 5,
                qualityScore: qualityScore,
                totalDonations: 0,
                totalReactions: 0,
                totalProjectUpdates: 0,
                verified: true,
                giveBacks: true
            });

            await project.save();
        } catch(e) {
            // Log Error but keep going with the rest of the projects
            console.log(e);
            continue;
        };
    };
};

// Current Formula: This will be changed in the future
const getQualityScore = (description, hasImageUpload) => {
    let qualityScore = 40;

    if (description.length > 100) qualityScore = qualityScore + 10;
    if (hasImageUpload) qualityScore = qualityScore + 30;

    return qualityScore;
}

const getAppropriateSlug = async (slugBase: string) => {
    let slug = slugBase.toLowerCase();
    const projectCount = await Project
      .createQueryBuilder('project')
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
}

const findOrCreateCategories = async (categories: [GivingBlocksCategory]) => {
    const currentCategories = await Promise.all(
        categories.map(async category => {
            let [c] = await Category.find({ givingBlocksId: category.id })
            if (c === undefined) {
                c = new Category();
                c.givingBlocksId = category.id;
                c.name = category.name;
            }
            return c;
        })
    );

    return currentCategories;
};
