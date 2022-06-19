import { Project } from '../entities/project';

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

export const userIsOwnerOfProject = async (
  viewerUserId: number,
  slug: string,
): Promise<boolean> => {
  return (
    await Project.query(
      `SELECT EXISTS(SELECT * FROM project WHERE "adminUserId" = $1 AND slug = $2)`,
      [viewerUserId, slug],
    )
  )[0].exists;
};
