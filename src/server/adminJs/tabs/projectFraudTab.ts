import csv from 'csvtojson';
import {
  canAccessProjectFraudAction,
  ResourceActions,
} from '../adminJsPermissions.js';
import { AdminJsRequestInterface } from '../adminJs-types.js';
import { logger } from '../../../utils/logger.js';
import { messages } from '../../../utils/messages.js';
import { ProjectFraud } from '../../../entities/projectFraud.js';
import { errorMessages } from '../../../utils/errorMessages.js';

export const createProjectFraud = async (
  request: AdminJsRequestInterface,
  response,
) => {
  let message = messages.PROJECT_FRAUD_HAS_BEEN_CREATED_SUCCESSFULLY;
  logger.debug('createProjectFraud has been called() ', request.payload);

  let type = 'success';
  try {
    const { projectId, qfRoundId, csvData } = request.payload;
    if (csvData) {
      // Parse the CSV data
      const jsonArray = await csv().fromString(csvData);

      // Validate and extract all unique slugs
      // Slugs are project urls that comms team use
      const slugs: string[] = [];
      jsonArray.forEach((obj, index) => {
        if (!obj.slug || !obj.qfRoundId) {
          // Include the row ID in the error message, adding 1 for human readability
          throw new Error(`Missing data for csv row: ${index + 1}`);
        }
        slugs.push(obj.slug.toLowerCase());
      });

      // Get projectIds for all slugs
      const projects = await ProjectFraud.query(`
        SELECT id, slug FROM public.project WHERE lower("slug") IN (${slugs
          .map(slug => `'${slug.toLowerCase()}'`)
          .join(', ')})
      `);

      // Map lowercased slugs to projectId
      const projectIdsMap = new Map(
        projects?.map(row => [row.slug.toLowerCase(), row.id]),
      );
      // Construct values for insertion
      const values = jsonArray
        .map(obj => {
          const slugProjectId = projectIdsMap.get(obj.slug.toLowerCase());
          return slugProjectId
            ? `(${Number(slugProjectId)}, ${Number(obj.qfRoundId)})`
            : null;
        })
        .filter(value => value !== null) // Filter out any rows where userId was not found
        .join(',');

      if (!values) {
        throw new Error(errorMessages.NO_VALID_PROJECTS_FOUND);
      }

      // Insert query
      const query = `
        INSERT INTO project_fraud ("projectId", "qfRoundId")
        VALUES ${values}
        ON CONFLICT ("projectId", "qfRoundId") DO NOTHING
    `;

      // Execute the query
      await ProjectFraud.query(query);
    } else {
      const projectFraud = new ProjectFraud();
      projectFraud.projectId = projectId;
      projectFraud.qfRoundId = qfRoundId;
      await projectFraud.save();
    }

    logger.debug(
      'Project Fraud has been created successfully',
      request.payload,
    );
  } catch (e) {
    message = e.message;
    type = 'danger';
    logger.error('create project fraud error', e);
  }

  response.send({
    redirectUrl: '/admin/resources/ProjectFraud',
    record: {},
    notice: {
      message,
      type,
    },
  });
};

export const ProjectFraudTab = {
  resource: ProjectFraud,

  options: {
    properties: {
      projectId: {
        isVisible: true,
      },
      qfRoundId: {
        isVisible: true,
      },
      csvData: {
        type: 'textarea',
        // Csv file columns
        // qfRoundId,Slug
        isVisible: {
          filter: false,
          list: false,
          show: false,
          new: true,
          edit: true,
        },
      },
    },

    actions: {
      new: {
        handler: createProjectFraud,

        isAccessible: ({ currentAdmin }) =>
          canAccessProjectFraudAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectFraudAction({ currentAdmin }, ResourceActions.EDIT),
      },
      delete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectFraudAction({ currentAdmin }, ResourceActions.DELETE),
      },
      bulkDelete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectFraudAction({ currentAdmin }, ResourceActions.EDIT),
      },
    },
  },
};
