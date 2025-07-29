import { CauseProject } from '../entities/project';
import { Cause } from '../entities/project';
import { Project } from '../entities/project';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { logger } from '../utils/logger';

export const findCauseProjectByCauseAndProject = async (
  causeId: number,
  projectId: number,
): Promise<CauseProject | null> => {
  return CauseProject.findOne({
    where: { causeId, projectId },
    relations: ['cause', 'project'],
  });
};

export const findCauseProjectsByCauseId = async (
  causeId: number,
): Promise<CauseProject[]> => {
  return CauseProject.find({
    where: { causeId },
    relations: ['project'],
  });
};

export const createOrUpdateCauseProject = async (
  causeId: number,
  projectId: number,
  data: {
    amountReceived?: number;
    amountReceivedUsdValue?: number;
    causeScore?: number;
  },
): Promise<CauseProject> => {
  // Validate that cause and project exist
  const cause = await Cause.findOne({
    where: { id: causeId, projectType: 'cause' },
  });
  if (!cause) {
    throw new Error(i18n.__(translationErrorMessagesKeys.CAUSE_NOT_FOUND));
  }

  const project = await Project.findOne({
    where: { id: projectId },
  });
  if (!project) {
    throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
  }

  // Find existing CauseProject record
  let causeProject = await findCauseProjectByCauseAndProject(
    causeId,
    projectId,
  );

  if (causeProject) {
    // Update existing record
    if (data.amountReceived !== undefined) {
      causeProject.amountReceived = data.amountReceived;
    }
    if (data.amountReceivedUsdValue !== undefined) {
      causeProject.amountReceivedUsdValue = data.amountReceivedUsdValue;
    }
    if (data.causeScore !== undefined) {
      causeProject.causeScore = data.causeScore;
    }
  } else {
    // Create new record
    causeProject = CauseProject.create({
      causeId,
      projectId,
      amountReceived: data.amountReceived || 0,
      amountReceivedUsdValue: data.amountReceivedUsdValue || 0,
      causeScore: data.causeScore || 0,
    });
  }

  await causeProject.save();
  return causeProject;
};

export const updateCauseProjectDistribution = async (
  causeId: number,
  projectId: number,
  amountReceived: number,
  amountReceivedUsdValue: number,
): Promise<CauseProject> => {
  logger.info('Updating cause project distribution data', {
    causeId,
    projectId,
    amountReceived,
    amountReceivedUsdValue,
  });

  // Validate that cause and project exist
  const cause = await Cause.findOne({
    where: { id: causeId, projectType: 'cause' },
  });
  if (!cause) {
    throw new Error(i18n.__(translationErrorMessagesKeys.CAUSE_NOT_FOUND));
  }

  const project = await Project.findOne({
    where: { id: projectId },
  });
  if (!project) {
    throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
  }

  // Find existing CauseProject record
  let causeProject = await findCauseProjectByCauseAndProject(
    causeId,
    projectId,
  );

  if (causeProject) {
    // Update existing record by accumulating amounts
    causeProject.amountReceived =
      (causeProject.amountReceived || 0) + amountReceived;
    causeProject.amountReceivedUsdValue =
      (causeProject.amountReceivedUsdValue || 0) + amountReceivedUsdValue;
  } else {
    // Create new record
    causeProject = CauseProject.create({
      causeId,
      projectId,
      amountReceived,
      amountReceivedUsdValue,
      causeScore: 0,
    });
  }

  await causeProject.save();
  return causeProject;
};

export const updateCauseProjectEvaluation = async (
  causeId: number,
  projectId: number,
  causeScore: number,
): Promise<CauseProject> => {
  logger.info('Updating cause project evaluation data', {
    causeId,
    projectId,
    causeScore,
  });

  return createOrUpdateCauseProject(causeId, projectId, {
    causeScore,
  });
};

export const bulkUpdateCauseProjectDistribution = async (
  updates: Array<{
    causeId: number;
    projectId: number;
    amountReceived: number;
    amountReceivedUsdValue: number;
  }>,
): Promise<CauseProject[]> => {
  const results: CauseProject[] = [];

  for (const update of updates) {
    const result = await updateCauseProjectDistribution(
      update.causeId,
      update.projectId,
      update.amountReceived,
      update.amountReceivedUsdValue,
    );
    results.push(result);
  }

  return results;
};

export const bulkUpdateCauseProjectEvaluation = async (
  updates: Array<{
    causeId: number;
    projectId: number;
    causeScore: number;
  }>,
): Promise<CauseProject[]> => {
  const results: CauseProject[] = [];

  for (const update of updates) {
    const result = await updateCauseProjectEvaluation(
      update.causeId,
      update.projectId,
      update.causeScore,
    );
    results.push(result);
  }

  return results;
};
