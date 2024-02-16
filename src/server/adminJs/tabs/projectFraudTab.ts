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
    const { projectId, qfRoundId, csvData, confirmedFraud } = request.payload;
    if (csvData) {
      // Parse the CSV data
      const jsonArray = await csv().fromString(csvData);

      // Validate and extract all unique walletAddresses
      const slugs: string[] = [];
      for (const obj of jsonArray) {
        if (!obj.walletAddress || !obj.qfRoundId) {
          throw new Error('Missing slug for project');
        }
        slugs.push(obj.slug.toLowerCase());
      }
      const uniqueWalletAddresses = [...new Set(slugs)];

      // Get projectIds for all slugs
      const projects = await ProjectFraud.query(`
        SELECT id, slug FROM public.project WHERE lower("slug") IN (${slugs
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
          const slugProjectId = projectIdsMap.get(
            obj.walletAddress.toLowerCase(),
          );
          return slugProjectId
            ? `(true, ${Number(slugProjectId)}, ${Number(obj.qfRoundId)})`
            : null;
        })
        .join(',');

      if (!values) {
        throw new Error('No valid entries to insert');
      }

      // Insert query
      const query = `
        INSERT INTO project_fraud ("confirmedFraud", "projectId", "qfRoundId")
        VALUES ${values};
    `;

      // Execute the query
      await ProjectFraud.query(query);
    } else {
      const projectFraud = new ProjectFraud();
      projectFraud.confirmedFraud = true;
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
      confirmedFraud: {
        isVisible: true,
      },
      projectId: {
        isVisible: true,
      },
      qfRoundId: {
        isVisible: true,
      },
      csvData: {
        type: 'textarea',
        // Csv file columns
        // qfRoundId,walletAddress
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
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
  },
};
