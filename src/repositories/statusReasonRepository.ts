import { ProjectStatusReason } from '../entities/projectStatusReason';

export const findAllStatusReasons = async (): Promise<
  ProjectStatusReason[]
> => {
  const query = ProjectStatusReason.createQueryBuilder(
    'project_status_reason',
  ).leftJoinAndSelect('project_status_reason.status', 'status');

  return query.getMany();
};

export const findStatusReasonsByStatusId = async (
  statusId: number,
): Promise<ProjectStatusReason[]> => {
  const query = ProjectStatusReason.createQueryBuilder(
    'project_status_reason',
  ).leftJoinAndSelect('project_status_reason.status', 'status');
  query.where(`"statusId" = ${statusId}`);
  const result = await query.getMany();
  return result;
};
