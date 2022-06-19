import { UpdateResult } from 'typeorm';
import { Project, ProjectUpdate, ProjStatus } from '../entities/project';
import { ProjectVerificationForm } from '../entities/projectVerificationForm';
import { ProjectAddress } from '../entities/projectAddress';
import { errorMessages } from '../utils/errorMessages';
import { Reaction } from '../entities/reaction';
import { publicSelectionFields } from '../entities/user';

export const findProjectById = (
  projectId: number,
): Promise<Project | undefined> => {
  // return Project.findOne({ id: projectId });

  return Project.createQueryBuilder('project')
    .leftJoinAndSelect('project.status', 'status')
    .leftJoinAndSelect('project.addresses', 'addresses')
    .leftJoin('project.adminUser', 'user')
    .addSelect(publicSelectionFields)
    .where({
      id: projectId,
    })
    .getOne();
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
  projectsIds: string[] | number[];
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
  for (const relatedAddress of verificationForm.managingFunds
    .relatedAddresses) {
    await ProjectAddress.create({
      title: relatedAddress.title,
      address: relatedAddress.address,
      networkId: relatedAddress.networkId,
      projectId: verificationForm.projectId,
      user: verificationForm.user,
      project,
      isRecipient: false,
    }).save();
  }
  project.contacts = verificationForm.projectContacts;
  await project.save();
  return (await findProjectById(project.id)) as Project;
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
