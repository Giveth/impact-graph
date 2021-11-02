import axios from 'axios';
import { Project, ProjStatus } from '../../entities/project';
import config from '../../config';
import { Buffer } from 'buffer';
import { NextFunction, Request, Response } from 'express';
import { errorMessages } from '../../utils/errorMessages';

export interface UpdateCampaignData {
  title?: string;
  campaignId?: string;
  description?: string;
  image?: string;
  verified?: boolean;
  archived?: boolean;
}

export const updateCampaignInTrace = async (
  project: Project,
): Promise<void> => {
  try {
    if (!project.isTraceable) {
      console.log(
        'updateCampaignInTrace(), the project is not a trace campaign',
        {
          projectId: project.id,
        },
      );
      return;
    }
    const payload: UpdateCampaignData = {
      campaignId: project.traceCampaignId,
      title: project.title,
      description: project.description,
      image: project.image,
      verified: project.verified,
      archived: project.statusId === ProjStatus.cancel,
    };
    const updateCampaignUrl = config.get('TRACE_UPDATE_CAMPAIGN_URL') as string;
    const username = config.get('TRACE_UPDATE_CAMPAIGN_USERNAME');
    const password = config.get('TRACE_UPDATE_CAMPAIGN_PASSWORD');
    return axios.put(updateCampaignUrl, payload, {
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      },
    });
  } catch (e) {
    console.log('updateCampaignInTrace() error', {
      e,
      project,
    });
  }
};

export async function updateTraceableProjectsHandler(
  request: Request,
  response: Response,
) {
  try {
    const requestData = request.body;
    const project = await Project.findOne(request.params.id);
    if (!project) {
      throw new Error(errorMessages.PROJECT_NOT_FOUND);
    }
    project.title = requestData.title;
    project.description = requestData.description;
    project.isTraceable = true;
    project.traceCampaignId = requestData.campaignId;
    await project.save();
    response.status(200).send(project);
  } catch (e) {
    console.log('updateTraceableProjects() error', e);
    response.status(500).send({
      message: e.message,
    });
  }
}
export async function authorizeGivethTrace(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { authorization } = req.headers;
  const traceUsername = config.get('TRACE_USERNAME');
  const tracePassword = config.get('TRACE_PASSWORD');
  if (!traceUsername || !authorization || !authorization.includes(' ')) {
    return res.status(401).send({ message: errorMessages.UN_AUTHORIZED });
  }
  const { username, password } = decodeBasicAuthentication(authorization);
  if (username !== traceUsername || password !== tracePassword) {
    return res.status(401).send({ message: errorMessages.UN_AUTHORIZED });
  }
  return next();
}

const decodeBasicAuthentication = basicAuthentication => {
  const [username, password] = Buffer.from(
    basicAuthentication.split(' ')[1],
    'base64',
  )
    .toString()
    .split(':');
  return { username, password };
};
