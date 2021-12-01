import { schedule } from 'node-cron';
import { Project } from '../../entities/project';
import { login, refreshToken, organizations, depositAddress, projectDescription } from './api';
import config from '../../config';
import { useActionResponseHandler } from 'admin-bro';
import { getRepository } from 'typeorm';
import slugify from 'slugify';

const cronJobTime = '*/1 * * * *';

// const projectRepository = getRepository(Project);

export const runGivingBlocksProjectSynchronization = () => {
    console.log('runGivingBlocksProjectSynchronization() has been called');
    schedule(cronJobTime, async () => {
        await exportGivingBlocksProjects();
    });
}

const exportGivingBlocksProjects = async () => {
    // const authResponse = await login();
    // const accessToken = authResponse.data.data.accessToken;

    // const organizationResponse = await organizations(accessToken);
    // const givingBlocksProjects = organizationResponse.data.data.organizations;

    // for (const givingBlockProject of givingBlocksProjects) {
    //     const slug = slugify(givingBlockProject.name);
    //     const givethProject = await Project.find({ slug })

    //     if (!givethProject) {
    //         const description = await projectDescription(slug);
    //         const organizationData = {
    //             organizationId: 1,
    //             isAnonymous: true,
    //             pledgeAmount: '0.1',
    //             pledgeCurrency: 'ETH'
    //         }
    //         const addressResponse = await depositAddress(accessToken, organizationData);
    //         // const project = Project.create({
    //         //     title: '',
    //         //     description,
    //         //     impactLocation: '',
    //         //     coOrdinates: '',
    //         //     walletAddress: address,
    //         //     creationDate: new Date(),
    //         //     slug,
    //         //     slugHistory: [],
    //         //     admin: 1,
    //         //     status: 5,
    //         //     qualityScore: 1,
    //         //     totalDonations: 0,
    //         //     totalReactions: 0,
    //         //     totalProjectUpdates: 0,
    //         //     verified: true,
    //         //     giveBacks: false
    //         // });
    //         const project = projectRepository.create({
    //             title: 'Giveth - Support the future of giving',
    //             description: `Join us in building the future of giving!\n\nIn addition to maintaining beta.giveth.io, we’re actively developing v2.giveth.io, the free, open-source, and decentralized application for peer-to-peer donations. Donations such as yours are our primary source of funding and are deeply appreciated! 💜\n\nProgress 🚀\n\n - Giveth now has 501c3 status!\n - The beta version of Giveth is live at beta.giveth.io with free donations for projects!\n - We’re building the next evolution of Giveth at v2.giveth.io and making incredible progress. Take it for a test drive and let us know what you think!\n - We are Hiring! We are looking for experienced devs and project managers to join the team!\n\nIn the next evolution of Giveth, we're building upon firsthand experience over the past 3+ years with the Giveth Dapp. The V2 is starting out with a simple purpose:\n\nEnable projects anywhere in the world to start accepting donations in a few minutes, with zero fees and zero censorship.\n\nOffer the best experience for anyone looking to donate to a cause, whether with crypto or a credit card.\n\nCheck out the in-progress v2, and please donate to help make this dream a reality!`,
    //             organisationId: 1,
    //             giveBacks: true,
    //             verified: true,
    //             admin: '1',
    //             creationDate: new Date(),
    //             walletAddress: '0x8f951903C9360345B4e1b536c7F5ae8f88A64e79',
    //             slug: 'gdsgdiveth',
    //             image: 'projectBg',
    //             totalDonations: 0,
    //             traceCampaignId: "10000000",
    //             totalReactions: 0,
    //           });
    //     }
    // };
    // console.log(organizationResponse);
};
