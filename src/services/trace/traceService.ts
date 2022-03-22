import { Project, ProjStatus } from '../../entities/project';
import { errorMessages } from '../../utils/errorMessages';
import { ProjectStatus } from '../../entities/projectStatus';
import { RedisOptions } from 'ioredis';
import { logger } from '../../utils/logger';
import axios from 'axios';
import { NETWORK_IDS } from '../../provider';
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
  logger.error('updateCampaignQueue connection error', err);
});
updateGivethIoProjectQueue.on('error', err => {
  logger.error('updateGivethIoProjectQueue connection error', err);
});

setInterval(async () => {
  const updateCampaignQueueCount = await updateCampaignQueue.count();
  const updateGivethIoProjectQueueCount =
    await updateGivethIoProjectQueue.count();
  logger.info(`Sync trace and givethio job queues count:`, {
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
      logger.debug(
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
      archived: project.statusId === ProjStatus.cancelled,
    };

    logger.debug('dispatchProjectUpdateEvent() add event to queue', payload);
    // Giveth trace will handle this event
    await updateGivethIoProjectQueue.add(payload);
  } catch (e) {
    logger.error('updateCampaignInTrace() error', {
      e,
      project,
    });
  }
};

export const initHandlingTraceCampaignUpdateEvents = () => {
  updateCampaignQueue.process(1, async (job, done) => {
    logger.debug('Listen to events of ', updateCampaignQueue.name);

    // These events come from Giveth trace
    try {
      const { givethIoProjectId, campaignId, status, title, description } =
        job.data;
      logger.debug('updateGivethIoProjectQueue(), job.data', job.data);
      const project = await Project.findOne(givethIoProjectId);
      if (!project) {
        throw new Error(errorMessages.PROJECT_NOT_FOUND);
      }
      project.traceCampaignId = campaignId;
      project.isImported = true;
      project.title = title;
      project.description = description;
      let statusId;
      if (status === 'Archived') {
        statusId = ProjStatus.cancelled;
      } else if (
        status === 'Active' &&
        project.status.id === ProjStatus.cancelled
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
      logger.error('updateGivethIoProjectQueue() error', e);
      done();
    }
  });
};

export const getCampaignTotalDonationsInUsd = async (
  campaignId: string,
): Promise<number> => {
  const url = `${process.env.GIVETH_TRACE_BASE_URL}/campaignTotalDonationValue/${campaignId}`;
  try {
    const result = await axios.get(url);
    return result.data.totalUsdValue;
  } catch (e) {
    logger.error('getCampaignTotalDonationsInUsd error', e);
    throw e;
  }
};

interface TraceDonationInterface {
  status: string;
  usdValue: number;
  amount: string;
  giverAddress: string;
  homeTxHash: string;
  txHash: string;
  token: {
    symbol: string;

    // It is incorrect value
    // decimals: number;
  };
  campaignId: string;
  createdAt: string;
}

export const getCampaignDonations = async (input: {
  campaignId: string;
  take: number;
  skip: number;
}): Promise<{
  total: number;
  donations: [
    {
      createdAt: Date;
      amount: number;
      currency: string;
      valueUsd: number;
      transactionId: string;
      transactionNetworkId: number;
      fromWalletAddress: string;
    },
  ];
}> => {
  const { campaignId, take, skip } = input;
  const url = `${process.env.GIVETH_TRACE_BASE_URL}/donations`;
  // For see how REST calls of feathers application should be, see https://docs.feathersjs.com/api/client/rest.html#find
  const urlWithQueryString = `${url}?$sort[createdAt]=-1&status[$in]=Committed&status[$in]=Waiting&ownerTypeId=${campaignId}&$limit=${take}$$skip=${skip}`;
  // Query inspired by https://github.com/Giveth/feathers-giveth/blob/2d990df8e87087f8da0e70146a5adb4f41ab7f75/src/services/aggregateDonations/aggregateDonations.service.js#L23-L39
  try {
    const result = await axios.get(urlWithQueryString);
    const donations = result.data.data.map(
      (traceDonation: TraceDonationInterface) => {
        return {
          createdAt: new Date(traceDonation.createdAt),
          amount: Number(traceDonation.amount) / 10 ** 18,
          currency: traceDonation.token.symbol,
          valueUsd: traceDonation.usdValue,

          // Currently trace just support mainnet donations
          transactionNetworkId: NETWORK_IDS.MAIN_NET,

          transactionId: traceDonation.homeTxHash || traceDonation.txHash,
          fromWalletAddress: traceDonation.giverAddress,
        };
      },
    );
    return {
      total: result.data.total,
      donations,
    };
  } catch (e) {
    logger.error('getCampaignDonations error', e);
    throw e;
  }
};
