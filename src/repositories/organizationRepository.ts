import { Organization } from '../entities/organization';

export const findOrganizationById = async (
  id: number,
): Promise<Organization | null> => {
  return Organization.findOne({ where: { id } });
};
