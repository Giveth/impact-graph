import { ProjectStatusReason } from '../entities/projectStatusReason.js';

export const findAllStatusReasons = async (): Promise<
  ProjectStatusReason[]
> => {
  return ProjectStatusReason.createQueryBuilder('project_status_reason')
    .leftJoinAndSelect('project_status_reason.status', 'status')
    .getMany();
};

export const findStatusReasonsByStatusId = async (
  statusId: number,
): Promise<ProjectStatusReason[]> => {
  return ProjectStatusReason.createQueryBuilder('project_status_reason')
    .leftJoinAndSelect('project_status_reason.status', 'status')
    .where('project_status_reason."statusId" = :statusId', { statusId })
    .getMany();
};
