import { QfRound } from '../entities/qfRound';
import { findProjectById } from './projectRepository';
import { getOrttoPersonAttributes } from '../adapters/notifications/NotificationCenterAdapter';
import { getNotificationAdapter } from '../adapters/adaptersFactory';
import { AppDataSource } from '../orm';

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

  if (params.add) {
    query = `
      INSERT INTO project_qf_rounds_qf_round ("projectId", "qfRoundId") 
      VALUES ${values}
      ON CONFLICT ("projectId", "qfRoundId") DO NOTHING;`;
    const projects = await Promise.all(
      params.projectIds.map(id => findProjectById(id)),
    );
    const orttoPeople = projects.map(project =>
      getOrttoPersonAttributes({
        userId: project?.adminUser.id?.toString(),
        QFProjectOwner: params.qfRound.name,
      }),
    );
    await getNotificationAdapter().updateOrttoPeople(orttoPeople);
  } else {
    const projectIds = params.projectIds.join(',');
    query = `
      DELETE FROM project_qf_rounds_qf_round
      WHERE "qfRoundId" = ${params.qfRound.id}
        AND "projectId" IN (${projectIds});`;
  }
  return AppDataSource.getDataSource().query(query);
};
