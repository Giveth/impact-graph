import { Project, ProjStatus } from '../../entities/project';
import { errorMessages } from '../../utils/errorMessages';
import { ProjectStatus } from '../../entities/projectStatus';
import { RedisOptions } from 'ioredis';
// tslint:disable-next-line:no-var-requires
const Queue = require('bull');

const TWO_MINUTES = 1000 * 60 * 2;

// There is shared redis between giveth.io and trace.giveth.io notify each other about verifiedCampaigns/project update
const redisConfig: RedisOptions = {
  host: process.env.SHARED_REDIS_HOST,
  port: Number(process.env.SHARED_REDIS_PORT),
};
if (process.env.SHARED_REDIS_PASSWORD) {
  redisConfig.password = process.env.SHARED_REDIS_PASSWORD;
}

const updateCampaignQueue = new Queue('trace-campaign-updated', {
  redis: redisConfig,
});
const updateGivethIoProjectQueue = new Queue('givethio-project-updated', {
  redis: redisConfig,
});

updateCampaignQueue.on('error', err => {
  console.log('updateCampaignQueue connection error', err);
});
updateGivethIoProjectQueue.on('error', err => {
  console.log('updateGivethIoProjectQueue connection error', err);
});

setInterval(async () => {
  const updateCampaignQueueCount = await updateCampaignQueue.count();
  const updateGivethIoProjectQueueCount = await updateGivethIoProjectQueue.count();
  console.log(`Sync trace and givethio job queues count:`, {
    updateCampaignQueueCount,
    updateGivethIoProjectQueueCount,
  });
}, TWO_MINUTES);

export interface UpdateCampaignData {
  title: string;
  campaignId?: string;
  description: string;
  verified?: boolean;
  archived?: boolean;
}

export const dispatchProjectUpdateEvent = async (
  project: Project,
): Promise<void> => {
  try {
    if (!project.traceCampaignId) {
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
      description: project.description as string,
      verified: project.verified,
      archived: project.statusId === ProjStatus.cancel,
    };

    console.log('dispatchProjectUpdateEvent() add event to queue', payload);
    // Giveth trace will handle this event
    await updateGivethIoProjectQueue.add(payload);
  } catch (e) {
    console.log('updateCampaignInTrace() error', {
      e,
      project,
    });
  }
};

export const initHandlingTraceCampaignUpdateEvents = () => {
  updateCampaignQueue.process(1, async (job, done) => {
    console.log('Listen to events of ', updateCampaignQueue.name);

    // These events come from Giveth trace
    try {
      const { givethIoProjectId, campaignId, status, title, description } =
        job.data;
      console.log('updateGivethIoProjectQueue(), job.data', job.data);
      const project = await Project.findOne(givethIoProjectId);
      if (!project) {
        throw new Error(errorMessages.PROJECT_NOT_FOUND);
      }
      project.traceCampaignId = campaignId;
      project.title = title;
      project.description = description;
      let statusId;
      if (status === 'Archived') {
        statusId = ProjStatus.cancel;
      } else if (
        status === 'Active' &&
        project.status.id === ProjStatus.cancel
      ) {
        // Maybe project status is deactive in giveth.io, so we should not
        // change to active in this case, we just change the cancel status to active with this endpoint
        statusId = ProjStatus.active;
      }
      if (statusId) {
        const projectStatus = (await ProjectStatus.findOne({
          id: statusId,
        })) as ProjectStatus;
        project.status = projectStatus;
      }

      await project.save();
      done();
    } catch (e) {
      console.log('updateGivethIoProjectQueue() error', e);
      done();
    }
  });
};
