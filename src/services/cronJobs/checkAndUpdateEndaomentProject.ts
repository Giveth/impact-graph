import axios from 'axios';
import { schedule } from 'node-cron';
import { Project, ProjStatus } from '../../entities/project';
import { logger } from '../../utils/logger';

const cronJobTime = '0 0 1 * *'; // Runs once a month

export const runCheckAndUpdateEndaomentProject = async () => {
  logger.debug(
    'runCheckAndUpdateEndaomentProject() has been called, cronJobTime',
    cronJobTime,
  );

  schedule(cronJobTime, async () => {
    logger.debug('runCheckAndUpdateEndaomentProject() has been started');
    try {
      // Fetch all projects with organizationId = 5
      const projects = await Project.find({ where: { organizationId: 5 } });

      for (const project of projects) {
        try {
          // Fetch details from Endaoment API
          const orgData = await EndaomentService.fetchOrgDetails(
            project.endaomentId,
          );

          // Update project details or mark as cancelled
          await EndaomentService.updateProjectDetails(project, orgData);
        } catch (error) {
          logger.error(`Failed to update project ID ${project.id}`, error);
        }
      }
    } catch (error) {
      logger.error('runCheckAndUpdateEndaomentProject() error', error);
    }
    logger.debug('runCheckAndUpdateEndaomentProject() has been finished');
  });
};

const API_URL = process.env.ENDAOMENT_API_URL;

export class EndaomentService {
  static async fetchOrgDetails(orgId: string): Promise<any> {
    try {
      const response = await axios.get(`${API_URL}/${orgId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        logger.warn(`Org ID ${orgId} has been offboarded.`);
        return null; // Indicate the project is offboarded
      }
      logger.error(`Failed to fetch data for Org ID: ${orgId}`, error);
      throw error;
    }
  }

  static async updateProjectDetails(
    project: Project,
    orgData: any,
  ): Promise<void> {
    logger.debug('Fetched org data:', orgData);
    if (!orgData) {
      // Mark the project as cancelled if offboarded
      project.statusId = ProjStatus.cancelled;
      project.updatedAt = new Date();
      await project.save();
      logger.info(`Project ID ${project.id} marked as cancelled (offboarded).`);
    } else {
      // Update project fields with the fetched data
      project.title = orgData.name || project.title;
      project.description = orgData.description || project.description;
      project.updatedAt = new Date();
      await project.save();
      logger.info(`Project ID ${project.id} updated successfully.`);
    }

    await project.save();
  }
}
