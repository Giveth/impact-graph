import { RecordJSON } from 'adminjs/src/frontend/interfaces/record-json.interface';
import { ActionResponse } from 'adminjs';
import { ProjectQfRound } from '../../../entities/projectQfRound';
import {
  canAccessProjectQfRoundAction,
  ResourceActions,
} from '../adminJsPermissions';
import {
  AdminJsRequestInterface,
  AdminJsContextInterface,
} from '../adminJs-types';
import { logger } from '../../../utils/logger';
import { updateProjectStatistics } from '../../../services/projectService';
import { updateUserTotalReceived } from '../../../services/userService';
import { findProjectById } from '../../../repositories/projectRepository';

const deleteProjectQfRound = async (
  request: AdminJsRequestInterface,
  response,
  context: AdminJsContextInterface,
) => {
  const { record, currentAdmin, resource, h } = context;
  let message = 'Project QF Round deleted successfully';
  let type = 'success';

  try {
    // Get the record ID from request params
    const recordId = request.params?.recordId;

    logger.debug('Deleting ProjectQfRound:', {
      recordId,
      recordParams: record.params,
      adminUserId: currentAdmin.id,
    });

    // Extract the id from record params
    const id = record.params?.id;

    logger.info('Record data:', {
      recordId,
      id,
      allParams: record.params,
    });

    if (!id) {
      throw new Error('Missing id in record params');
    }

    // Delete using the new auto-incrementing primary key
    const deleteResult = await ProjectQfRound.delete({
      id: id,
    });

    logger.info('ProjectQfRound deleted successfully:', {
      id,
      deleteResult,
      adminUserId: currentAdmin.id,
    });
  } catch (error) {
    logger.error('Error deleting ProjectQfRound:', {
      error: error.message,
      recordParams: record.params,
      adminUserId: currentAdmin.id,
    });
    message = 'Failed to delete Project QF Round: ' + error.message;
    type = 'error';
  }

  // Create a proper RecordJSON object for the response
  const recordJson: RecordJSON = {
    baseError: null,
    id: record.id,
    title: '',
    bulkActions: [],
    errors: {},
    params: record.params || {},
    populated: record.populated || {},
    recordActions: [],
  };

  // Get redirect URL to the list view using AdminJS helper
  const redirectUrl = h.resourceUrl({
    resourceId: resource._decorated?.id() || resource.id(),
  });

  logger.info('Delete handler response:', {
    redirectUrl,
    message,
    type,
  });

  return {
    record: recordJson,
    redirectUrl,
    notice: {
      message,
      type,
    },
  };
};

/**
 * Update project and project user statistics after ProjectQfRound creation
 *
 * MAIN PURPOSE: to update the statistics for a given project and QF round when project has been added to a QF round
 *
 * @param response ActionResponse
 * @returns Promise<ActionResponse>
 */
const afterCreateUpdateStatistics = async (
  response: ActionResponse,
): Promise<ActionResponse> => {
  const record = response.record;
  if (!record) return response;

  try {
    const projectId = Number(record.params?.projectId);
    const qfRoundId = Number(record.params?.qfRoundId);

    if (projectId && qfRoundId) {
      logger.debug('Updating statistics after ProjectQfRound creation:', {
        projectId,
        qfRoundId,
      });

      // Update statistics for this project-round combination
      await updateProjectStatistics(projectId, qfRoundId);

      // Update project user statistics
      const project = await findProjectById(projectId);
      if (project?.adminUser?.id) {
        await updateUserTotalReceived(project.adminUser.id);
      }

      logger.info(
        'Statistics updated successfully after ProjectQfRound creation:',
        {
          projectId,
          qfRoundId,
        },
      );
    }
  } catch (error) {
    logger.error('Error updating statistics after ProjectQfRound creation:', {
      error: error.message,
      recordParams: record.params,
    });
    // Don't fail the creation, just log the error
  }

  return response;
};

export const projectQfRoundsTab = {
  resource: ProjectQfRound,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction({ currentAdmin }, ResourceActions.SHOW),
      },
      delete: {
        isVisible: true,
        handler: deleteProjectQfRound,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      new: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction({ currentAdmin }, ResourceActions.NEW),
        after: afterCreateUpdateStatistics,
      },
      edit: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction({ currentAdmin }, ResourceActions.EDIT),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
    properties: {
      id: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      projectId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      qfRoundId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      sumDonationValueUsd: {
        isVisible: {
          list: true,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      countUniqueDonors: {
        isVisible: {
          list: true,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      createdAt: {
        type: 'datetime',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
        props: {
          step: 1,
        },
      },
      updatedAt: {
        type: 'datetime',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
        props: {
          step: 1,
        },
      },
    },
  },
};
