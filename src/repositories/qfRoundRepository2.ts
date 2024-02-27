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
      VALUES ${values}
      ON CONFLICT ("projectId", "qfRoundId") DO NOTHING;`;
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
    orttoPeople = projects.map(project =>
      getOrttoPersonAttributes({
        firstName: project?.adminUser?.firstName,
        lastName: project?.adminUser?.lastName,
        email: project?.adminUser?.email,
        userId: project?.adminUser.id?.toString(),
        QFProjectOwnerRemoved: params.qfRound.name,
      }),
    );
  }
  await getNotificationAdapter().updateOrttoPeople(orttoPeople);
  return AppDataSource.getDataSource().query(query);
};
