import {
  canAccessProjectStatusReasonAction,
  ResourceActions,
} from '../adminJsPermissions';
import {
  AdminJsContextInterface,
  AdminJsRequestInterface,
} from '../adminJs-types';
import { logger } from '../../../utils/logger';
import csv from 'csvtojson';
import { messages } from '../../../utils/messages';
import { ProjectFraud } from '../../../entities/projectFraud';

export const createProjectFraud = async (
  request: AdminJsRequestInterface,
  response,
  context: AdminJsContextInterface,
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
      const uniqueSlugs = [...new Set(slugs)];

      // Get projectIds for all slugs
      const projects = await ProjectFraud.query(`
        SELECT id, slug FROM public.project WHERE lower("slug") IN (${uniqueSlugs
          .map(slug => `'${slug}'`)
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
        .join(',');

      if (!values) {
        throw new Error('No valid entries to insert');
      }

      // Insert query
      const query = `
        INSERT INTO project_fraud ("projectId", "qfRoundId")
        VALUES ${values};
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
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.NEW,
          ),
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.EDIT,
          ),
      },
      delete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      bulkDelete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
  },
};
