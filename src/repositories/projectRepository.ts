import { UpdateResult } from 'typeorm';
import { Project, ProjectUpdate } from '../entities/project';
import { ProjectVerificationForm } from '../entities/projectVerificationForm';
import { ProjectAddress } from '../entities/projectAddress';
import { errorMessages } from '../utils/errorMessages';

export const findProjectById = (
  projectId: number,
): Promise<Project | undefined> => {
  return Project.findOne({ id: projectId });
};

export const findProjectBySlug = (
  slug: string,
): Promise<Project | undefined> => {
  // check current slug and previous slugs
  return Project.createQueryBuilder('project')
    .where(`:slug = ANY(project."slugHistory") or project.slug = :slug`, {
      slug,
    })
    .getOne();
};

export const verifyMultipleProjects = async (params: {
  verified: boolean;
  projectsIds: string[];
}): Promise<UpdateResult> => {
  return Project.createQueryBuilder('project')
    .update<Project>(Project, { verified: params.verified })
    .where('project.id IN (:...ids)')
    .setParameter('ids', params.projectsIds)
    .returning('*')
    .updateEntity(true)
    .execute();
};

export const updateProjectWithVerificationForm = async (
  verificationForm: ProjectVerificationForm,
  project: Project,
): Promise<Project> => {
  const projectUpdate = await ProjectUpdate.findOne({
    isMain: true,
    projectId: project.id,
  });

  if (!projectUpdate) throw new Error(errorMessages.PROJECT_UPDATE_NOT_FOUND);

  projectUpdate.mission = verificationForm.milestones.mission!;
  projectUpdate.achievedMilestones =
    verificationForm.milestones.achievedMilestones!;
  projectUpdate.foundationDate = new Date(
    Date.parse(String(verificationForm.milestones.foundationDate)),
  );
  projectUpdate.managingFundDescription =
    verificationForm.managingFunds.description!;
  projectUpdate.isNonProfitOrganization =
    verificationForm.projectRegistry.isNonProfitOrganization!;
  projectUpdate.organizationCountry =
    verificationForm.projectRegistry.organizationCountry!;
  projectUpdate.organizationWebsite =
    verificationForm.projectRegistry.organizationWebsite!;
  projectUpdate.organizationDescription =
    verificationForm.projectRegistry.organizationDescription!;

  await projectUpdate.save();

  // TODO: update links in project update. Or is it enough with the project one to many?
  const relatedAddresses: ProjectAddress[] = [];

  for (const relatedAddress of verificationForm.managingFunds
    .relatedAddresses) {
    relatedAddresses.push(
      ProjectAddress.create({
        title: relatedAddress.title,
        address: relatedAddress.address,
        networkId: relatedAddress.networkId,
        projectId: verificationForm.projectId,
        userId: verificationForm.userId,
        isRecipient: false,
      }),
    );
  }
  project.projectAddresses = relatedAddresses;
  return project.save();
};

export const verifyProject = async (params: {
  verified: boolean;
  projectId: number;
}): Promise<Project> => {
  const project = await Project.findOne({ id: params.projectId });

  if (!project) throw new Error(errorMessages.PROJECT_NOT_FOUND);

  project.verified = params.verified;
  return project.save();
};

export const findProjectByWalletAddress = async (
  walletAddress: string,
): Promise<Project | undefined> => {
  return Project.createQueryBuilder('project')
    .where(`LOWER("walletAddress") = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
    .leftJoinAndSelect('project.status', 'status')
    .getOne();
};
