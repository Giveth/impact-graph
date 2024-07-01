import { QfRound } from '../entities/qfRound';
import { getOrttoPersonAttributes } from '../adapters/notifications/NotificationCenterAdapter';
import { getNotificationAdapter } from '../adapters/adaptersFactory';
import { AppDataSource } from '../orm';
import { Project } from '../entities/project';
import { OrttoPerson } from '../adapters/notifications/NotificationAdapterInterface';

// The repository functions that uses Project entity should be here
export const relateManyProjectsToQfRound = async (params: {
  projectIds: number[];
  qfRound: QfRound;
  add: boolean;
}) => {
  const values = params.projectIds
    .map(projectId => `(${projectId}, ${params.qfRound.id})`)
    .join(', ');

  let query;
  let orttoPeople: OrttoPerson[] = [];
  const projects = await Promise.all(
    params.projectIds.map(id => Project.findOne({ where: { id } })),
  );
  if (params.add) {
    query = `
      INSERT INTO project_qf_rounds_qf_round ("projectId", "qfRoundId")
      SELECT v.projectId, v.qfRoundId
      FROM (VALUES ${values}) AS v(projectId, qfRoundId)
      WHERE EXISTS (SELECT 1 FROM project p WHERE p.id = v.projectId)
        AND EXISTS (SELECT 1 FROM qf_round q WHERE q.id = v.qfRoundId)
      ON CONFLICT ("projectId", "qfRoundId") DO NOTHING;
    `;

    const qfRoundProjects = await Project.createQueryBuilder('project')
      .leftJoin('project.qfRounds', 'qfRound')
      .where('qfRound.id = :qfRoundId', { qfRoundId: params.qfRound.id })
      .getMany();
    if (qfRoundProjects.length > 0) {
      const newAddedProjectIds = params.projectIds.filter(
        projectId => !qfRoundProjects.find(project => project.id === projectId),
      );
      if (newAddedProjectIds.length > 0) {
        await Project.update(newAddedProjectIds, {
          countUniqueDonorsForActiveQfRound: 0,
          sumDonationValueUsdForActiveQfRound: 0,
        });
      }
    }

    orttoPeople = projects.map(project =>
      getOrttoPersonAttributes({
        firstName: project?.adminUser?.firstName,
        lastName: project?.adminUser?.lastName,
        email: project?.adminUser?.email,
        userId: project?.adminUser.id?.toString(),
        QFProjectOwnerAdded: params.qfRound.name,
      }),
    );
  } else {
    const projectIds = params.projectIds.join(',');
    query = `
      DELETE FROM project_qf_rounds_qf_round
      WHERE "qfRoundId" = ${params.qfRound.id}
        AND "projectId" IN (${projectIds});`;

    const qfRoundProjects = await Project.createQueryBuilder('project')
      .leftJoin('project.qfRounds', 'qfRound')
      .where('qfRound.id = :qfRoundId', { qfRoundId: params.qfRound.id })
      .leftJoinAndSelect('project.adminUser', 'adminUser')
      .getMany();

    const projectsAdminIds = projects.map(project => project?.adminUser.id);
    const projectsUniqueAdminIds = [...new Set(projectsAdminIds)];
    const projectsToRemoveFromOrtto: Project[] = [];
    projectsUniqueAdminIds.forEach(id => {
      const toRemoveProjects = projects.filter(
        project => project?.adminUser.id === id,
      );
      const userQFRoundProjectsCount = qfRoundProjects.filter(
        project => project.adminUser.id === id,
      ).length;
      if (toRemoveProjects.length === userQFRoundProjectsCount) {
        projectsToRemoveFromOrtto.push(toRemoveProjects[0]!);
      }
    });
    // We should remove the tag only if user has no other projects in the round
    orttoPeople = projectsToRemoveFromOrtto.map(project =>
      getOrttoPersonAttributes({
        firstName: project?.adminUser?.firstName,
        lastName: project?.adminUser?.lastName,
        email: project?.adminUser?.email,
        userId: project?.adminUser.id?.toString(),
        QFProjectOwnerRemoved: params.qfRound.name,
      }),
    );
  }
  if (orttoPeople.length > 0) {
    await getNotificationAdapter().updateOrttoPeople(orttoPeople);
  }
  return AppDataSource.getDataSource().query(query);
};
