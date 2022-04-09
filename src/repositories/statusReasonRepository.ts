import { ProjectStatusReason } from '../entities/projectStatusReason';

export const findAllStatusReasons = async () => {
  const query = await ProjectStatusReason.createQueryBuilder(
    'project_status_reason',
  ).leftJoinAndSelect('project_status_reason.status', 'status');

  return query.getMany();
};

export const findStatusReasonsByStatusId = async (statusId: number) => {
  const query = await ProjectStatusReason.createQueryBuilder(
    'project_status_reason',
  ).leftJoinAndSelect('project_status_reason.status', 'status');
  query.where(`"statusId" = ${statusId}`);
  return query.getMany();
};
